import type { PrismaClient } from "@prisma/client";
import type { VorcaroActionProposalRecord } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";
import type { VorcaroSelfCorrectionDiagnostic } from "@/modules/vorcaro/conversation/domain/types/vorcaro-conversation-context";
import { VorcaroConversationSelfCorrectionService } from "@/modules/vorcaro/conversation/application/services/vorcaro-conversation-self-correction.service";
import { VorcaroConversationMemoryService } from "@/modules/vorcaro/conversation/application/services/vorcaro-conversation-memory.service";
import type { VorcaroIntent, VorcaroIntentDetection, VorcaroToolName, VorcaroToolResult } from "../../domain/types/vorcaro-intent";
import { VorcaroIntentCacheService } from "./vorcaro-intent-cache.service";
import { VorcaroIntentEngineService } from "./vorcaro-intent-engine.service";
import { VorcaroIntentObservabilityService } from "./vorcaro-intent-observability.service";

export type VorcaroToolCallingResult = {
  detection: VorcaroIntentDetection;
  tools: string[];
  results: VorcaroToolResult[];
  answer: string;
  responseMode: "tool" | "llm";
  actionProposals?: VorcaroActionProposalRecord[];
  diagnostic?: VorcaroSelfCorrectionDiagnostic;
};

export class VorcaroToolCallingService {
  private readonly intentEngine = new VorcaroIntentEngineService();
  private readonly memory = new VorcaroConversationMemoryService();
  private readonly selfCorrection: VorcaroConversationSelfCorrectionService;

  constructor(
    prisma: PrismaClient,
    private readonly cache: VorcaroIntentCacheService = new VorcaroIntentCacheService(),
    private readonly observability: VorcaroIntentObservabilityService = new VorcaroIntentObservabilityService(),
  ) {
    this.selfCorrection = new VorcaroConversationSelfCorrectionService(
      prisma,
      this.memory,
      this.cache,
      this.observability,
    );
  }

  detect(message: string, activeTopic?: string | null, lockedIntent?: VorcaroIntent | null) {
    const detection = this.intentEngine.detect(message, activeTopic, { lockedIntent });
    this.observability.recordIntentDetected();
    return detection;
  }

  async execute(input: {
    userId: string;
    message: string;
    activeTopic?: string | null;
    channel?: "WEB" | "TELEGRAM";
    lastIntent?: VorcaroIntent | null;
    lastToolUsed?: VorcaroToolName | null;
    priorUserMessages?: string[];
  }): Promise<VorcaroToolCallingResult> {
    const result = await this.selfCorrection.execute(input);
    return {
      detection: result.detection,
      tools: result.tools,
      results: result.results,
      answer: result.answer,
      responseMode: result.responseMode,
      actionProposals: result.actionProposals,
      diagnostic: result.diagnostic,
    };
  }
}
