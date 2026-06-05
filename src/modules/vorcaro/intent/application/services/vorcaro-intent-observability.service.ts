import type { VorcaroIntentObservabilitySnapshot } from "../../domain/types/vorcaro-intent";
import type { VorcaroSelfCorrectionDiagnostic } from "@/modules/vorcaro/conversation/domain/types/vorcaro-conversation-context";

export class VorcaroIntentObservabilityService {
  private metrics: VorcaroIntentObservabilitySnapshot = {
    intent_detected: 0,
    tool_called: 0,
    tool_only_response: 0,
    llm_called: 0,
    fallback_to_llm: 0,
    responses_approved: 0,
    responses_rejected: 0,
    wrong_tool_detected: 0,
    context_switch_blocked: 0,
    humanization_applied: 0,
    responses_regenerated: 0,
  };

  private lastDiagnostic: VorcaroSelfCorrectionDiagnostic | null = null;

  recordIntentDetected(): void {
    this.metrics.intent_detected += 1;
  }

  recordToolCalled(count = 1): void {
    this.metrics.tool_called += count;
  }

  recordToolOnlyResponse(): void {
    this.metrics.tool_only_response += 1;
  }

  recordLlmCalled(): void {
    this.metrics.llm_called += 1;
  }

  recordFallbackToLlm(): void {
    this.metrics.fallback_to_llm += 1;
  }

  recordResponseApproved(): void {
    this.metrics.responses_approved += 1;
  }

  recordResponseRejected(): void {
    this.metrics.responses_rejected += 1;
  }

  recordWrongToolDetected(): void {
    this.metrics.wrong_tool_detected += 1;
  }

  recordContextSwitchBlocked(): void {
    this.metrics.context_switch_blocked += 1;
  }

  recordHumanizationApplied(): void {
    this.metrics.humanization_applied += 1;
  }

  recordResponseRegenerated(): void {
    this.metrics.responses_regenerated += 1;
  }

  setLastDiagnostic(diagnostic: VorcaroSelfCorrectionDiagnostic): void {
    this.lastDiagnostic = diagnostic;
  }

  lastSelfCorrectionDiagnostic(): VorcaroSelfCorrectionDiagnostic | null {
    return this.lastDiagnostic ? { ...this.lastDiagnostic } : null;
  }

  snapshot(): VorcaroIntentObservabilitySnapshot {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      intent_detected: 0,
      tool_called: 0,
      tool_only_response: 0,
      llm_called: 0,
      fallback_to_llm: 0,
      responses_approved: 0,
      responses_rejected: 0,
      wrong_tool_detected: 0,
      context_switch_blocked: 0,
      humanization_applied: 0,
      responses_regenerated: 0,
    };
    this.lastDiagnostic = null;
  }
}

/** Instância compartilhada para métricas de sessão/processo */
export const vorcaroIntentObservability = new VorcaroIntentObservabilityService();
