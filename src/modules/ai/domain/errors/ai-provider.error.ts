import type { AiProviderName } from "../ports/ai-provider.port";

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly provider: AiProviderName,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class AiRouterExhaustedError extends Error {
  constructor(message = "Todos os provedores de IA falharam ou estão indisponíveis.") {
    super(message);
    this.name = "AiRouterExhaustedError";
  }
}
