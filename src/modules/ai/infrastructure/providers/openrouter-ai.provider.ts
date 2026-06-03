import type { AiJsonInput, AiProviderPort, AiTextInput, AiTextResult } from "../../domain/ports/ai-provider.port";
import { AiProviderError } from "../../domain/errors/ai-provider.error";
import { callOpenAiCompatibleChat, extractJsonFromText, withProviderTimeout } from "./provider-utils";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterAiProvider implements AiProviderPort {
  readonly name = "openrouter" as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new AiProviderError("OPENROUTER_API_KEY não configurada", "openrouter");
    }
    this.apiKey = apiKey;
    this.model = options?.model ?? process.env.OPENROUTER_MODEL ?? "openrouter/auto";
  }

  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  }

  async generateText(input: AiTextInput): Promise<AiTextResult> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const { text, raw } = await withProviderTimeout("openrouter", (signal) =>
        callOpenAiCompatibleChat({
          url: OPENROUTER_URL,
          apiKey: this.apiKey,
          model: this.model,
          system: input.system,
          prompt: input.prompt,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          signal,
          extraHeaders: {
            "HTTP-Referer": appUrl,
            "X-Title": "Vorcaro Finance Control",
          },
        }),
      );
      return { provider: "openrouter", model: this.model, text, raw };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError("Falha na geração OpenRouter", "openrouter", error);
    }
  }

  async generateJson<T>(input: AiJsonInput): Promise<T> {
    const jsonPrompt = `${input.prompt}\n\nResponda APENAS com JSON válido${input.schemaName ? ` (${input.schemaName})` : ""}, sem markdown.`;
    const result = await this.generateText({ ...input, prompt: jsonPrompt });
    try {
      return extractJsonFromText<T>(result.text);
    } catch (error) {
      throw new AiProviderError("JSON inválido retornado pelo OpenRouter", "openrouter", error);
    }
  }
}
