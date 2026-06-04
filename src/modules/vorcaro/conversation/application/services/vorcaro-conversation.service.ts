import type { PrismaClient } from "@prisma/client";
import { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import { AiRouterExhaustedError } from "@/modules/ai/domain/errors/ai-provider.error";
import { AdvisorActionGuardrailService } from "@/modules/financial-consultant/application/services/advisor-action-guardrail.service";
import { AdvisorLanguageGuardrailService } from "@/modules/financial-consultant/application/services/advisor-language-guardrail.service";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { deriveVorcaroCriticalFromConsultation } from "@/modules/vorcaro/domain/derive-vorcaro-critical-context";
import { VorcaroMessagingService } from "@/modules/vorcaro/application/services/vorcaro-messaging.service";
import { VorcaroActionError } from "@/modules/vorcaro/actions/domain/errors/vorcaro-action.error";
import type { VorcaroActionProposalRecord } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";
import { VorcaroActionInterpreterService } from "@/modules/vorcaro/actions/application/services/vorcaro-action-interpreter.service";
import { VorcaroActionProposalService } from "@/modules/vorcaro/actions/application/services/vorcaro-action-proposal.service";
import { PrismaVorcaroActionProposalRepository } from "@/modules/vorcaro/actions/infrastructure/repositories/prisma-vorcaro-action-proposal.repository";
import { VorcaroToolCallingService } from "@/modules/vorcaro/intent/application/services/vorcaro-tool-calling.service";
import { vorcaroIntentObservability } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-observability.service";
import {
  VORCARO_CHAT_RATE_LIMIT_TELEGRAM_PER_HOUR,
  VORCARO_CHAT_RATE_LIMIT_WEB_PER_HOUR,
  type VorcaroChatActionExecutionDto,
  type VorcaroChatActionProposalDto,
  type VorcaroChatResponse,
  type VorcaroConversationChannel,
  type VorcaroConversationRecord,
  type VorcaroMessageRecord,
} from "../../domain/types/vorcaro-conversation";
import { PrismaVorcaroConversationRepository } from "../../infrastructure/repositories/prisma-vorcaro-conversation.repository";
import { VorcaroContextAggregatorService } from "./vorcaro-context-aggregator.service";
import { VorcaroConversationMemoryService } from "./vorcaro-conversation-memory.service";
import { VorcaroPromptBuilderService } from "./vorcaro-prompt-builder.service";
import { VorcaroChatGuardrailService } from "./vorcaro-chat-guardrail.service";

export class VorcaroConversationService {
  private readonly repo: PrismaVorcaroConversationRepository;
  private readonly aggregator: VorcaroContextAggregatorService;
  private readonly memory = new VorcaroConversationMemoryService();
  private readonly promptBuilder = new VorcaroPromptBuilderService();
  private readonly toolCalling: VorcaroToolCallingService;
  private readonly actionProposals: VorcaroActionProposalService;
  private readonly actionInterpreter: VorcaroActionInterpreterService;
  private readonly guardrail = new VorcaroChatGuardrailService();
  private readonly vorcaro: VorcaroMessagingService;
  private readonly consultant: IntelligentAdvisorService;
  private readonly actionGuardrail = new AdvisorActionGuardrailService();
  private readonly languageGuardrail = new AdvisorLanguageGuardrailService();
  private readonly aiRouter: AiRouterService;

  constructor(private readonly prisma: PrismaClient, aiRouter?: AiRouterService) {
    this.repo = new PrismaVorcaroConversationRepository(prisma);
    this.aggregator = new VorcaroContextAggregatorService(prisma);
    this.vorcaro = new VorcaroMessagingService(prisma);
    this.consultant = new IntelligentAdvisorService(prisma);
    this.toolCalling = new VorcaroToolCallingService(prisma);
    const actionRepo = new PrismaVorcaroActionProposalRepository(prisma);
    this.actionProposals = new VorcaroActionProposalService(actionRepo);
    this.actionInterpreter = new VorcaroActionInterpreterService(actionRepo);
    this.aiRouter = aiRouter ?? new AiRouterService();
  }

  async listConversations(userId: string) {
    return this.repo.listByUser(userId);
  }

  async getConversation(userId: string, conversationId: string) {
    return this.repo.findById(conversationId, userId);
  }

  async getMessages(userId: string, conversationId: string): Promise<VorcaroMessageRecord[]> {
    const conversation = await this.repo.findById(conversationId, userId);
    if (!conversation) return [];
    return this.repo.listMessages(conversationId, 100);
  }

  async createConversation(userId: string, channel: VorcaroConversationChannel, title?: string) {
    return this.repo.create({ userId, channel, title });
  }

  async sendMessage(input: {
    userId: string;
    message: string;
    channel: VorcaroConversationChannel;
    conversationId?: string;
  }): Promise<VorcaroChatResponse> {
    await this.assertRateLimit(input.userId, input.channel);

    let conversation: VorcaroConversationRecord;
    if (input.conversationId) {
      const existing = await this.repo.findById(input.conversationId, input.userId);
      if (!existing) throw new Error("CONVERSATION_NOT_FOUND");
      conversation = existing;
    } else {
      conversation =
        (await this.repo.findLatestByChannel(input.userId, input.channel)) ??
        (await this.repo.create({
          userId: input.userId,
          channel: input.channel,
          title: this.memory.inferTitle(input.message),
        }));
    }

    const priorMessages = await this.repo.listMessages(conversation.id, 50);
    const activeTopic = this.memory.detectTopic(input.message, conversation.activeTopic);
    if (activeTopic !== conversation.activeTopic) {
      conversation = await this.repo.updateTopic(conversation.id, input.userId, activeTopic);
    }

    await this.repo.addMessage({
      conversationId: conversation.id,
      role: "USER",
      content: input.message,
      metadata: { topic: activeTopic },
    });

    const aggregated = await this.aggregator.aggregate(input.userId, activeTopic);
    const confidence = this.guardrail.resolveConfidence(aggregated.dataScore, aggregated.usedSources);

    if (this.actionInterpreter.isInterpretable(input.message)) {
      const handled = await this.tryHandleActionInterpretation({
        userId: input.userId,
        message: input.message,
        conversation,
        confidence,
        usedSources: aggregated.usedSources,
        activeTopic,
      });
      if (handled) return handled;
    }

    if (this.guardrail.shouldBlockInsufficientData(aggregated.dataScore, aggregated.usedSources)) {
      const answer = this.guardrail.insufficientDataMessage;
      const saved = await this.persistAssistantMessage(conversation.id, answer, {
        confidence: "LOW",
        provider: "n/a",
        model: "n/a",
      });
      return {
        conversationId: conversation.id,
        messageId: saved.id,
        answer,
        provider: "n/a",
        model: "n/a",
        confidence: "LOW",
        usedSources: aggregated.usedSources,
        activeTopic,
      };
    }

    const toolResult = await this.toolCalling.execute({
      userId: input.userId,
      message: input.message,
      activeTopic,
    });

    if (toolResult.responseMode === "tool" && toolResult.answer) {
      const saved = await this.persistAssistantMessage(conversation.id, toolResult.answer, {
        confidence,
        provider: "deterministic",
        model: "intent-engine",
        intent: toolResult.detection.primary,
        tools: toolResult.tools,
      });
      await this.repo.touch(conversation.id, input.userId);
      return {
        conversationId: conversation.id,
        messageId: saved.id,
        answer: toolResult.answer,
        provider: "deterministic",
        model: "intent-engine",
        confidence,
        usedSources: [...aggregated.usedSources, ...toolResult.tools],
        activeTopic,
        responseMode: "tool",
        intent: toolResult.detection.primary,
        toolsUsed: toolResult.tools,
        actionProposals: toolResult.actionProposals?.map(toProposalDto),
      };
    }

    vorcaroIntentObservability.recordFallbackToLlm();

    const historyBlock = this.memory.buildHistoryBlock(priorMessages);
    const built = this.promptBuilder.build({
      aggregated,
      historyBlock,
      activeTopic,
      userMessage: input.message,
    });

    const consultation = await this.consultant.consult(input.userId);
    const criticalContext = deriveVorcaroCriticalFromConsultation(consultation);
    const category = this.vorcaro.inferCategoryFromCriticalContext(criticalContext);
    const llmContext = await this.vorcaro.buildLlmPromptContext({
      userId: input.userId,
      category,
      criticalContext,
    });

    const safeActions = this.actionGuardrail.validateActions(consultation.actions);
    const actionsBlock = safeActions
      .slice(0, 10)
      .map((a) => `- [${a.priority}] ${a.title} → ${a.actionUrl ?? "n/a"}`)
      .join("\n");

    const userPrompt = this.promptBuilder.buildUserPrompt({
      built,
      userMessage: input.message,
      topicHint: conversation.activeTopic ?? undefined,
    });

    const fullPrompt = `${userPrompt}

### Ações estruturadas do sistema (use APENAS estas)
${actionsBlock || "- Nenhuma ação pendente"}`;

    try {
      vorcaroIntentObservability.recordLlmCalled();
      const result = await this.aiRouter.generateText({
        system: llmContext.system,
        prompt: fullPrompt,
        temperature: 0.2,
        maxTokens: 1500,
      });

      let answer = result.text.includes(this.guardrail.insufficientDataMessage)
        ? this.guardrail.insufficientDataMessage
        : result.text;

      answer = this.actionGuardrail.sanitizeLlmAnswer(answer, safeActions);
      answer = this.languageGuardrail.enrichAnswerWithObjectiveMetrics(answer, safeActions);
      answer = this.guardrail.sanitizeAnswer(answer);

      const saved = await this.persistAssistantMessage(conversation.id, answer, {
        confidence,
        provider: result.provider,
        model: result.model,
      });
      await this.repo.touch(conversation.id, input.userId);

      return {
        conversationId: conversation.id,
        messageId: saved.id,
        answer,
        provider: result.provider,
        model: result.model,
        confidence,
        usedSources: aggregated.usedSources,
        activeTopic,
        responseMode: "llm",
        intent: toolResult.detection.primary,
      };
    } catch (error) {
      if (error instanceof AiRouterExhaustedError) {
        const answer = "Os provedores de IA estão indisponíveis no momento. Tente novamente em instantes.";
        const saved = await this.persistAssistantMessage(conversation.id, answer, {
          confidence: "LOW",
          provider: "n/a",
          model: "n/a",
        });
        return {
          conversationId: conversation.id,
          messageId: saved.id,
          answer,
          provider: "n/a",
          model: "n/a",
          confidence: "LOW",
          usedSources: aggregated.usedSources,
          activeTopic,
        };
      }
      throw error;
    }
  }

  private async persistAssistantMessage(
    conversationId: string,
    content: string,
    meta: Record<string, unknown>,
  ) {
    return this.repo.addMessage({
      conversationId,
      role: "VORCARO",
      content,
      metadata: meta,
    });
  }

  private async tryHandleActionInterpretation(input: {
    userId: string;
    message: string;
    conversation: VorcaroConversationRecord;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    usedSources: string[];
    activeTopic: string | null;
  }): Promise<VorcaroChatResponse | null> {
    const interpretation = this.actionInterpreter.interpret(input.message);
    if (!interpretation) return null;

    const pending = await this.actionInterpreter.findEligiblePendingProposal(input.userId);
    if (!pending) {
      const answer =
        "Não há ação pendente para confirmar. Peça uma análise ao Vorcaro ou use o painel de ações.";
      const saved = await this.persistAssistantMessage(input.conversation.id, answer, {
        confidence: input.confidence,
        provider: "deterministic",
        model: "action-interpreter",
        responseMode: "action",
      });
      await this.repo.touch(input.conversation.id, input.userId);
      return {
        conversationId: input.conversation.id,
        messageId: saved.id,
        answer,
        provider: "deterministic",
        model: "action-interpreter",
        confidence: input.confidence,
        usedSources: input.usedSources,
        activeTopic: input.activeTopic,
        responseMode: "action",
      };
    }

    try {
      if (interpretation === "REJECT") {
        await this.actionProposals.rejectProposal(input.userId, pending.id);
        const answer = `Ok, não vou abrir **${pending.title}**.`;
        const saved = await this.persistAssistantMessage(input.conversation.id, answer, {
          confidence: input.confidence,
          provider: "deterministic",
          model: "action-interpreter",
          proposalId: pending.id,
          responseMode: "action",
        });
        await this.repo.touch(input.conversation.id, input.userId);
        return {
          conversationId: input.conversation.id,
          messageId: saved.id,
          answer,
          provider: "deterministic",
          model: "action-interpreter",
          confidence: input.confidence,
          usedSources: input.usedSources,
          activeTopic: input.activeTopic,
          responseMode: "action",
        };
      }

      const { result } = await this.actionProposals.approveAndExecute(
        input.userId,
        pending.id,
      );
      const answer = formatExecutionAnswer(pending, result);
      const saved = await this.persistAssistantMessage(input.conversation.id, answer, {
        confidence: input.confidence,
        provider: "deterministic",
        model: "action-interpreter",
        proposalId: pending.id,
        responseMode: "action",
        targetUrl: result.targetUrl,
      });
      await this.repo.touch(input.conversation.id, input.userId);
      return {
        conversationId: input.conversation.id,
        messageId: saved.id,
        answer,
        provider: "deterministic",
        model: "action-interpreter",
        confidence: input.confidence,
        usedSources: input.usedSources,
        activeTopic: input.activeTopic,
        responseMode: "action",
        actionExecution: result,
      };
    } catch (error) {
      const answer =
        error instanceof VorcaroActionError
          ? error.message
          : "Não foi possível processar a confirmação da ação.";
      const saved = await this.persistAssistantMessage(input.conversation.id, answer, {
        confidence: "LOW",
        provider: "deterministic",
        model: "action-interpreter",
        responseMode: "action",
      });
      await this.repo.touch(input.conversation.id, input.userId);
      return {
        conversationId: input.conversation.id,
        messageId: saved.id,
        answer,
        provider: "deterministic",
        model: "action-interpreter",
        confidence: "LOW",
        usedSources: input.usedSources,
        activeTopic: input.activeTopic,
        responseMode: "action",
      };
    }
  }

  private async assertRateLimit(userId: string, channel: VorcaroConversationChannel) {
    const since = new Date(Date.now() - 3600_000);
    const limit =
      channel === "TELEGRAM"
        ? VORCARO_CHAT_RATE_LIMIT_TELEGRAM_PER_HOUR
        : VORCARO_CHAT_RATE_LIMIT_WEB_PER_HOUR;
    const count = await this.repo.countUserMessagesSince(userId, channel, since);
    if (count >= limit) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
  }
}

function toProposalDto(p: VorcaroActionProposalRecord): VorcaroChatActionProposalDto {
  return {
    id: p.id,
    actionType: p.actionType,
    title: p.title,
    description: p.description,
    status: p.status,
    expiresAt: p.expiresAt.toISOString(),
  };
}

function formatExecutionAnswer(
  proposal: VorcaroActionProposalRecord,
  result: VorcaroChatActionExecutionDto,
): string {
  if (result.status === "FAILED") {
    return `Não consegui concluir **${proposal.title}**: ${result.message}`;
  }
  const url = result.targetUrl ? `\n\nAbra no app: ${result.targetUrl}` : "";
  return `**${result.title}** — ${result.message}${url}`;
}
