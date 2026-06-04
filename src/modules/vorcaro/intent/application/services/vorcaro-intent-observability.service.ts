import type { VorcaroIntentObservabilitySnapshot } from "../../domain/types/vorcaro-intent";

export class VorcaroIntentObservabilityService {
  private metrics: VorcaroIntentObservabilitySnapshot = {
    intent_detected: 0,
    tool_called: 0,
    tool_only_response: 0,
    llm_called: 0,
    fallback_to_llm: 0,
  };

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
    };
  }
}

/** Instância compartilhada para métricas de sessão/processo */
export const vorcaroIntentObservability = new VorcaroIntentObservabilityService();
