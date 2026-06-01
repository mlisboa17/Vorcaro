import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import type {
  AIServicePort,
  AIExtractionOptions,
  FinancialExtraction,
  MediaAttachment,
} from "../../domain/ports/ai-service.port";
import { financialExtractionSchema } from "../../domain/schemas/financial-extraction.schema";
import { buildExtractionSystemPrompt } from "./extraction-system-prompt";
import {
  AUDIO_TRANSCRIPTION_PROMPT,
  buildImageOcrSystemPrompt,
  IMAGE_OCR_USER_PROMPT,
} from "./image-ocr-prompt";

/** Modelo estável no Free Tier do AI Studio (1.5-flash foi descontinuado). */
const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const MULTIMODAL_TIMEOUT_MS = 60_000;

const EXTRACTION_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["EXPENSE", "INCOME", "TRANSFER", "UNKNOWN"],
    },
    amount: { type: SchemaType.NUMBER, nullable: true },
    description: { type: SchemaType.STRING, nullable: true },
    category: { type: SchemaType.STRING, nullable: true },
    categoriaPrincipal: { type: SchemaType.STRING, nullable: true },
    subcategoria: { type: SchemaType.STRING, nullable: true },
    date: { type: SchemaType.STRING, nullable: true },
    paymentMethod: { type: SchemaType.STRING, nullable: true },
    paymentMethodType: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [
        "DINHEIRO",
        "PIX",
        "CARTAO_CREDITO",
        "CARTAO_DEBITO",
        "BOLETO",
        "TRANSFERENCIA_BANCARIA",
        "CARTEIRA_DIGITAL",
        "DEBITO_AUTOMATICO",
        "OTHER",
      ],
      nullable: true,
    },
    financialInstitution: { type: SchemaType.STRING, nullable: true },
    cardLastFourDigits: { type: SchemaType.STRING, nullable: true },
    cardBrand: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"],
      nullable: true,
    },
    installments: { type: SchemaType.NUMBER, nullable: true },
    confidence: {
      type: SchemaType.OBJECT,
      properties: {
        type: { type: SchemaType.NUMBER },
        amount: { type: SchemaType.NUMBER },
        description: { type: SchemaType.NUMBER },
        category: { type: SchemaType.NUMBER },
        categoriaPrincipal: { type: SchemaType.NUMBER },
        subcategoria: { type: SchemaType.NUMBER },
        date: { type: SchemaType.NUMBER },
        paymentMethod: { type: SchemaType.NUMBER },
        paymentMethodType: { type: SchemaType.NUMBER },
        financialInstitution: { type: SchemaType.NUMBER },
        cardLastFourDigits: { type: SchemaType.NUMBER },
        cardBrand: { type: SchemaType.NUMBER },
        installments: { type: SchemaType.NUMBER },
      },
    },
    missingFields: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    followUpQuestion: { type: SchemaType.STRING, nullable: true },
  },
  required: [
    "type",
    "amount",
    "description",
    "category",
    "categoriaPrincipal",
    "subcategoria",
    "date",
    "paymentMethod",
    "paymentMethodType",
    "financialInstitution",
    "cardLastFourDigits",
    "cardBrand",
    "installments",
    "confidence",
    "missingFields",
    "followUpQuestion",
  ],
};

export class GeminiAiService implements AIServicePort {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = options?.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  }

  async transcribeAudio(media: MediaAttachment): Promise<string> {
    const startedAt = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      const result = await withTimeout(
        model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { text: AUDIO_TRANSCRIPTION_PROMPT },
                {
                  inlineData: {
                    mimeType: media.mimeType,
                    data: media.base64,
                  },
                },
              ],
            },
          ],
        }),
        MULTIMODAL_TIMEOUT_MS,
      );

      const transcription = result.response.text()?.trim();

      if (!transcription) {
        throw new Error("Gemini returned an empty transcription");
      }

      return transcription;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini error";
      throw new Error(`Gemini transcription failed: ${message} (${Date.now() - startedAt}ms)`);
    }
  }

  async extract(rawContent: string, options?: AIExtractionOptions) {
    const referenceDate = options?.referenceDate ?? new Date();
    const startedAt = Date.now();
    const isImageMode = options?.media?.type === "image";

    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: isImageMode
          ? buildImageOcrSystemPrompt(referenceDate)
          : buildExtractionSystemPrompt(referenceDate),
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: EXTRACTION_RESPONSE_SCHEMA,
        },
      });

      const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];

      if (isImageMode && options?.media) {
        userParts.push({ text: rawContent.trim() || IMAGE_OCR_USER_PROMPT });
        userParts.push({
          inlineData: {
            mimeType: options.media.mimeType,
            data: options.media.base64,
          },
        });
      } else {
        userParts.push({ text: rawContent });
      }

      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: userParts }],
        }),
        isImageMode ? MULTIMODAL_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
      );

      const content = result.response.text();

      if (!content?.trim()) {
        throw new Error("Gemini returned an empty or corrupted payload");
      }

      let raw: unknown;
      try {
        raw = parseJsonContent(content);
      } catch {
        throw new Error("Gemini returned invalid JSON");
      }

      const validation = financialExtractionSchema.safeParse(raw);
      if (!validation.success) {
        throw new Error(`Gemini payload validation failed: ${validation.error.message}`);
      }

      const data: FinancialExtraction = validation.data;

      return {
        data,
        metadata: {
          provider: `gemini:${this.model}${isImageMode ? ":ocr" : ""}`,
          tokensUsed: result.response.usageMetadata?.totalTokenCount,
          processingMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini error";
      throw new Error(`Gemini extraction failed: ${message}`);
    }
  }
}

/** @deprecated Use GeminiAiService */
export const GeminiAIService = GeminiAiService;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1].trim());
    }

    const objectSlice = trimmed.match(/\{[\s\S]*\}/);
    if (objectSlice) {
      return JSON.parse(objectSlice[0]);
    }

    throw new Error("invalid JSON");
  }
}
