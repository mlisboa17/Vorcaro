import type { PrismaClient } from "@prisma/client";
import type { VorcaroActionProposalRecord } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";
import { VorcaroActionProposalService } from "@/modules/vorcaro/actions/application/services/vorcaro-action-proposal.service";
import {
  deriveSuggestedActionsFromToolResults,
  formatProposalCtaBlock,
} from "@/modules/vorcaro/actions/application/helpers/vorcaro-tool-action-suggestions";
import { PrismaVorcaroActionProposalRepository } from "@/modules/vorcaro/actions/infrastructure/repositories/prisma-vorcaro-action-proposal.repository";
import type { VorcaroIntentDetection, VorcaroToolResult } from "../../domain/types/vorcaro-intent";
import { VorcaroIntentCacheService } from "./vorcaro-intent-cache.service";
import { VorcaroIntentEngineService } from "./vorcaro-intent-engine.service";
import { VorcaroIntentObservabilityService } from "./vorcaro-intent-observability.service";
import { VorcaroIntentResponseFormatter } from "./vorcaro-intent-response-formatter.service";
import { VorcaroToolExecutorService } from "./vorcaro-tool-executor.service";
import { VorcaroToolResolverService } from "./vorcaro-tool-resolver.service";

export type VorcaroToolCallingResult = {
  detection: VorcaroIntentDetection;
  tools: string[];
  results: VorcaroToolResult[];
  answer: string;
  responseMode: "tool" | "llm";
  actionProposals?: VorcaroActionProposalRecord[];
};

export class VorcaroToolCallingService {
  private readonly intentEngine = new VorcaroIntentEngineService();
  private readonly resolver = new VorcaroToolResolverService();
  private readonly executor: VorcaroToolExecutorService;
  private readonly formatter = new VorcaroIntentResponseFormatter();
  private readonly actionProposals: VorcaroActionProposalService;

  constructor(
    prisma: PrismaClient,
    private readonly cache: VorcaroIntentCacheService = new VorcaroIntentCacheService(),
    private readonly observability: VorcaroIntentObservabilityService = new VorcaroIntentObservabilityService(),
  ) {
    this.executor = new VorcaroToolExecutorService(prisma);
    this.actionProposals = new VorcaroActionProposalService(
      new PrismaVorcaroActionProposalRepository(prisma),
    );
  }

  detect(message: string, activeTopic?: string | null): VorcaroIntentDetection {
    const detection = this.intentEngine.detect(message, activeTopic);
    this.observability.recordIntentDetected();
    return detection;
  }

  async execute(input: {
    userId: string;
    message: string;
    activeTopic?: string | null;
    channel?: "WEB" | "TELEGRAM";
  }): Promise<VorcaroToolCallingResult> {
    const detection = this.detect(input.message, input.activeTopic);
    const intentCacheKey = this.cache.buildIntentKey(input.userId, input.message);
    if (!detection.requiresLlm) {
      this.cache.setIntent(intentCacheKey, detection.primary);
    }

    if (detection.requiresLlm) {
      return {
        detection,
        tools: [],
        results: [],
        answer: "",
        responseMode: "llm",
      };
    }

    const tools = this.resolver.resolve(detection.primary, detection.related);
    if (tools.length === 0) {
      this.observability.recordFallbackToLlm();
      return {
        detection,
        tools: [],
        results: [],
        answer: "",
        responseMode: "llm",
      };
    }

    const consultation = await this.executor.loadConsultation(input.userId);
    const results: VorcaroToolResult[] = [];

    const memoryTools = new Set([
      "financial_timeline",
      "financial_evolution",
      "financial_achievements",
      "financial_trends",
    ]);
    if (tools.some((t) => memoryTools.has(t))) {
      await this.executor.ensureMemoryRefreshed(input.userId);
    }

    for (const toolName of tools) {
      const toolCacheKey = this.cache.buildToolKey(input.userId, toolName);
      let result = this.cache.getToolResult(toolCacheKey);
      if (!result) {
        result = await this.executor.executeTool(
          input.userId,
          toolName,
          consultation,
          input.message,
        );
        this.cache.setToolResult(toolCacheKey, result);
      }
      results.push(result);
      this.observability.recordToolCalled();
    }

    let answer = this.formatter.format(
      results,
      detection.primary === "STATUS" ? "Situação financeira" : undefined,
    );

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

    return {
      detection,
      tools,
      results,
      answer,
      responseMode: "tool",
      actionProposals: proposals.length > 0 ? proposals : undefined,
    };
  }
}
