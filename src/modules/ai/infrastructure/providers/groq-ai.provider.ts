import type { AiJsonInput, AiProviderPort, AiTextInput, AiTextResult } from "../../domain/ports/ai-provider.port";
import { AiProviderError } from "../../domain/errors/ai-provider.error";
import { callOpenAiCompatibleChat, extractJsonFromText, withProviderTimeout } from "./provider-utils";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqAiProvider implements AiProviderPort {
  readonly name = "groq" as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      throw new AiProviderError("GROQ_API_KEY não configurada", "groq");
    }
    this.apiKey = apiKey;
    this.model = options?.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  }

  static isConfigured(): boolean {
    return Boolean(process.env.GROQ_API_KEY?.trim());
  }

  async generateText(input: AiTextInput): Promise<AiTextResult> {
    try {
      const { text, raw } = await withProviderTimeout("groq", (signal) =>
        callOpenAiCompatibleChat({
          url: GROQ_URL,
          apiKey: this.apiKey,
          model: this.model,
          system: input.system,
          prompt: input.prompt,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          signal,
        }),
      );
      return { provider: "groq", model: this.model, text, raw };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError("Falha na geração Groq", "groq", error);
    }
  }

  async generateJson<T>(input: AiJsonInput): Promise<T> {
    const jsonPrompt = `${input.prompt}\n\nResponda APENAS com JSON válido${input.schemaName ? ` (${input.schemaName})` : ""}, sem markdown.`;
    const result = await this.generateText({ ...input, prompt: jsonPrompt });
    try {
      return extractJsonFromText<T>(result.text);
    } catch (error) {
      throw new AiProviderError("JSON inválido retornado pelo Groq", "groq", error);
    }
  }
}
