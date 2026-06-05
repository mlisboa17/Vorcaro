import type { PrismaClient } from "@prisma/client";
import type { VorcaroActionProposalRecord } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";
import { VorcaroActionProposalService } from "@/modules/vorcaro/actions/application/services/vorcaro-action-proposal.service";
import {
  deriveSuggestedActionsFromToolResults,
  formatProposalCtaBlock,
} from "@/modules/vorcaro/actions/application/helpers/vorcaro-tool-action-suggestions";
import { PrismaVorcaroActionProposalRepository } from "@/modules/vorcaro/actions/infrastructure/repositories/prisma-vorcaro-action-proposal.repository";
import type { VorcaroIntent, VorcaroIntentDetection, VorcaroToolName, VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import { VorcaroIntentCacheService } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-cache.service";
import { VorcaroIntentEngineService } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-engine.service";
import type { VorcaroIntentObservabilityService } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-observability.service";
import { VorcaroIntentResponseFormatter } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-response-formatter.service";
import { VorcaroToolExecutorService } from "@/modules/vorcaro/intent/application/services/vorcaro-tool-executor.service";
import { VorcaroToolResolverService } from "@/modules/vorcaro/intent/application/services/vorcaro-tool-resolver.service";
import type { VorcaroSelfCorrectionDiagnostic } from "../../domain/types/vorcaro-conversation-context";
import { VorcaroConversationContextService } from "./vorcaro-conversation-context.service";
import { VorcaroHumanizationGuard } from "./vorcaro-humanization-guard.service";
import { VorcaroResponseCriticService } from "./vorcaro-response-critic.service";
import type { VorcaroConversationMemoryService } from "./vorcaro-conversation-memory.service";

export type VorcaroSelfCorrectionResult = {
  detection: VorcaroIntentDetection;
  tools: string[];
  results: VorcaroToolResult[];
  answer: string;
  responseMode: "tool" | "llm";
  actionProposals?: VorcaroActionProposalRecord[];
  diagnostic: VorcaroSelfCorrectionDiagnostic;
};

export class VorcaroConversationSelfCorrectionService {
  private readonly intentEngine = new VorcaroIntentEngineService();
  private readonly resolver = new VorcaroToolResolverService();
  private readonly executor: VorcaroToolExecutorService;
  private readonly formatter = new VorcaroIntentResponseFormatter();
  private readonly contextService = new VorcaroConversationContextService();
  private readonly critic = new VorcaroResponseCriticService();
  private readonly humanization = new VorcaroHumanizationGuard();
  private readonly actionProposals: VorcaroActionProposalService;

  constructor(
    prisma: PrismaClient,
    private readonly memory: VorcaroConversationMemoryService,
    private readonly cache: VorcaroIntentCacheService,
    private readonly observability: VorcaroIntentObservabilityService,
  ) {
    this.executor = new VorcaroToolExecutorService(prisma);
    this.actionProposals = new VorcaroActionProposalService(
      new PrismaVorcaroActionProposalRepository(prisma),
    );
  }

  async execute(input: {
    userId: string;
    message: string;
    activeTopic?: string | null;
    channel?: "WEB" | "TELEGRAM";
    lastIntent?: VorcaroIntent | null;
    lastToolUsed?: VorcaroToolName | null;
    priorUserMessages?: string[];
  }): Promise<VorcaroSelfCorrectionResult> {
    const context = this.contextService.resolve({
      message: input.message,
      previousTopic: input.activeTopic,
      lastIntent: input.lastIntent ?? null,
      lastToolUsed: input.lastToolUsed ?? null,
      detectTopic: (message, previousTopic) => this.memory.detectTopic(message, previousTopic),
    });

    if (context.contextSwitchBlocked) {
      this.observability.recordContextSwitchBlocked();
    }

    let detection = this.intentEngine.detect(input.message, context.currentTopic, {
      lockedIntent: context.lockedIntent,
    });
    this.observability.recordIntentDetected();

    if (detection.requiresLlm) {
      const diagnostic = this.buildDiagnostic(input.message, context, detection, [], "", {
        approved: false,
        issues: ["requires_llm"],
        score: 0,
      }, false, false);
      this.observability.setLastDiagnostic(diagnostic);
      return {
        detection,
        tools: [],
        results: [],
        answer: "",
        responseMode: "llm",
        diagnostic,
      };
    }

    let tools = this.resolver.resolve(detection.primary, detection.related);
    if (tools.length === 0) {
      this.observability.recordFallbackToLlm();
      const diagnostic = this.buildDiagnostic(input.message, context, detection, tools, "", {
        approved: false,
        issues: ["no_tools"],
        score: 0,
      }, false, false);
      this.observability.setLastDiagnostic(diagnostic);
      return {
        detection,
        tools: [],
        results: [],
        answer: "",
        responseMode: "llm",
        diagnostic,
      };
    }

    let regenerated = false;
    let answer = "";
    let results: VorcaroToolResult[] = [];
    let critique = this.critic.critique({
      userMessage: input.message,
      context,
      selectedIntent: detection.primary,
      selectedTools: tools,
      generatedResponse: "",
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      const executed = await this.runTools(input.userId, input.message, tools, input.priorUserMessages);
      results = executed.results;
      answer = this.formatter.format(
        results,
        detection.primary === "STATUS" ? "Situação financeira" : undefined,
      );

      const humanized = this.humanization.sanitize(answer, detection.primary);
      if (humanized.applied) {
        this.observability.recordHumanizationApplied();
      }
      answer = humanized.text;

      critique = this.critic.critique({
        userMessage: input.message,
        context,
        selectedIntent: detection.primary,
        selectedTools: tools,
        generatedResponse: answer,
      });

      if (critique.approved || critique.score >= 0.7) {
        break;
      }

      if (attempt === 0 && critique.suggestedIntent && critique.suggestedIntent !== detection.primary) {
        this.observability.recordResponseRejected();
        if (critique.issues.includes("wrong_tool_for_topic") || critique.issues.includes("context_switch_blocked")) {
          this.observability.recordWrongToolDetected();
        }
        detection = this.intentEngine.detect(input.message, context.currentTopic, {
          lockedIntent: critique.suggestedIntent,
        });
        tools = this.resolver.resolve(detection.primary, detection.related);
        regenerated = true;
        this.observability.recordResponseRegenerated();
        continue;
      }

      this.observability.recordResponseRejected();
      break;
    }

    if (critique.approved || critique.score >= 0.7) {
      this.observability.recordResponseApproved();
    }

    const suggested = deriveSuggestedActionsFromToolResults(results);
    const proposals: VorcaroActionProposalRecord[] = [];
    for (const action of suggested) {
      const proposal = await this.actionProposals.createProposal({
        userId: input.userId,
        type: action.type,
        title: action.title,
        description: action.description,
        payload: action.payload,
      });
      proposals.push(proposal);
    }

    if (proposals.length > 0) {
      if (input.channel === "TELEGRAM") {
        answer +=
          "\n\n<b>Assistência Vorcaro</b> — use os botões abaixo para confirmar (sem alterar dados).";
      } else {
        answer += formatProposalCtaBlock(proposals);
      }
    }

    this.observability.recordToolOnlyResponse();

    const diagnostic = this.buildDiagnostic(
      input.message,
      context,
      detection,
      tools,
      answer,
      critique,
      regenerated,
      true,
    );
    this.observability.setLastDiagnostic(diagnostic);

    return {
      detection,
      tools,
      results,
      answer,
      responseMode: "tool",
      actionProposals: proposals.length > 0 ? proposals : undefined,
      diagnostic,
    };
  }

  private async runTools(
    userId: string,
    message: string,
    tools: VorcaroToolName[],
    priorUserMessages?: string[],
  ) {
    const consultation = await this.executor.loadConsultation(userId);
    const results: VorcaroToolResult[] = [];

    const memoryTools = new Set([
      "financial_timeline",
      "financial_evolution",
      "financial_achievements",
      "financial_trends",
    ]);
    if (tools.some((t) => memoryTools.has(t))) {
      await this.executor.ensureMemoryRefreshed(userId);
    }

    for (const toolName of tools) {
      const toolCacheKey = this.cache.buildToolKey(userId, toolName);
      let result = this.cache.getToolResult(toolCacheKey);
      if (!result) {
        result = await this.executor.executeTool(userId, toolName, consultation, message, {
          priorUserMessages,
        });
        this.cache.setToolResult(toolCacheKey, result);
      }
      results.push(result);
      this.observability.recordToolCalled();
    }

    return { results, consultation };
  }

  private buildDiagnostic(
    userMessage: string,
    context: VorcaroSelfCorrectionDiagnostic["context"],
    detection: VorcaroIntentDetection,
    tools: string[],
    answer: string,
    critique: VorcaroSelfCorrectionDiagnostic["critique"],
    regenerated: boolean,
    humanizationApplied: boolean,
  ): VorcaroSelfCorrectionDiagnostic {
    return {
      userMessage,
      context,
      selectedIntent: detection.primary,
      selectedTools: tools,
      critique,
      regenerated,
      humanizationApplied,
      finalAnswerPreview: answer.slice(0, 280),
      at: new Date().toISOString(),
    };
  }
}
