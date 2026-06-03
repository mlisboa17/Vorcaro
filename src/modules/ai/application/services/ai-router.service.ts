import type { AiJsonInput, AiProviderPort, AiTextInput, AiTextResult } from "../../domain/ports/ai-provider.port";
import { AiProviderError, AiRouterExhaustedError } from "../../domain/errors/ai-provider.error";
import { GeminiAiProvider } from "../../infrastructure/providers/gemini-ai.provider";
import { GroqAiProvider } from "../../infrastructure/providers/groq-ai.provider";
import { OpenRouterAiProvider } from "../../infrastructure/providers/openrouter-ai.provider";

export function createDefaultAiProviders(): AiProviderPort[] {
  const providers: AiProviderPort[] = [];
  if (GroqAiProvider.isConfigured()) {
    try {
      providers.push(new GroqAiProvider());
    } catch {
      /* skip */
    }
  }
  if (GeminiAiProvider.isConfigured()) {
    try {
      providers.push(new GeminiAiProvider());
    } catch {
      /* skip */
    }
  }
  if (OpenRouterAiProvider.isConfigured()) {
    try {
      providers.push(new OpenRouterAiProvider());
    } catch {
      /* skip */
    }
  }
  return providers;
}

export class AiRouterService {
  constructor(private readonly providers: AiProviderPort[] = createDefaultAiProviders()) {}

  async generateText(input: AiTextInput): Promise<AiTextResult> {
    const errors: AiProviderError[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.generateText(input);
      } catch (error) {
        if (error instanceof AiProviderError) {
          errors.push(error);
          continue;
        }
        errors.push(new AiProviderError("Erro inesperado", provider.name, error));
      }
    }

    throw new AiRouterExhaustedError(
      errors.length > 0 ? errors.map((e) => `${e.provider}: ${e.message}`).join(" | ") : undefined,
    );
  }

  async generateJson<T>(input: AiJsonInput): Promise<AiTextResult & { data: T }> {
    const errors: AiProviderError[] = [];

    for (const provider of this.providers) {
      try {
        const data = await provider.generateJson<T>(input);
        const text = JSON.stringify(data);
        return {
          provider: provider.name,
          model: provider.name,
          text,
          data,
        };
      } catch (error) {
        if (error instanceof AiProviderError) {
          errors.push(error);
          continue;
        }
        errors.push(new AiProviderError("Erro inesperado", provider.name, error));
      }
    }

    throw new AiRouterExhaustedError(
      errors.length > 0 ? errors.map((e) => `${e.provider}: ${e.message}`).join(" | ") : undefined,
    );
  }
}
