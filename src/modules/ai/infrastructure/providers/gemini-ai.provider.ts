import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiJsonInput, AiProviderPort, AiTextInput, AiTextResult } from "../../domain/ports/ai-provider.port";
import { AiProviderError } from "../../domain/errors/ai-provider.error";
import { extractJsonFromText, withProviderTimeout } from "./provider-utils";

export class GeminiAiProvider implements AiProviderPort {
  readonly name = "gemini" as const;
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new AiProviderError("GEMINI_API_KEY não configurada", "gemini");
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = options?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  static isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  async generateText(input: AiTextInput): Promise<AiTextResult> {
    try {
      const text = await withProviderTimeout("gemini", async () => {
        const model = this.client.getGenerativeModel({
          model: this.model,
          systemInstruction: input.system,
          generationConfig: {
            temperature: input.temperature ?? 0.2,
            maxOutputTokens: input.maxTokens ?? 2048,
          },
        });
        const result = await model.generateContent(input.prompt);
        const out = result.response.text()?.trim();
        if (!out) throw new Error("Resposta vazia do Gemini");
        return out;
      });
      return { provider: "gemini", model: this.model, text };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError("Falha na geração Gemini", "gemini", error);
    }
  }

  async generateJson<T>(input: AiJsonInput): Promise<T> {
    const jsonPrompt = `${input.prompt}\n\nResponda APENAS com JSON válido${input.schemaName ? ` (${input.schemaName})` : ""}, sem markdown.`;
    const result = await this.generateText({ ...input, prompt: jsonPrompt });
    try {
      return extractJsonFromText<T>(result.text);
    } catch (error) {
      throw new AiProviderError("JSON inválido retornado pelo Gemini", "gemini", error);
    }
  }
}
