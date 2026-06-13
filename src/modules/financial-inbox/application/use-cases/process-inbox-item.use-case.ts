import type { InboxStatus } from "@prisma/client";
import type { AIServicePort, AIExtractionOptions } from "../../domain/ports/ai-service.port";
import type { ExtractionResultRepositoryPort } from "../../domain/ports/extraction-result-repository.port";
import type { InboxRepositoryPort } from "../../domain/ports/inbox-repository.port";
import type { FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { ExtractionConfidence, FieldConfidence } from "@/modules/shared/domain/confidence";
import {
  isMediaPlaceholder,
  parseInboxMedia,
} from "../../domain/types/inbox-media";
import {
  EnrichExtractionUseCase,
  type EnrichExtractionResult,
} from "./enrich-extraction.use-case";

const CONFIDENCE_THRESHOLD = 0.75;
const CRITICAL_FIELDS = ["amount", "type"] as const;

export interface ProcessInboxItemInput {
  inboxItemId: string;
  userId: string;
}

export interface ProcessInboxItemOutput {
  status: InboxStatus;
  extraction: FinancialExtraction;
  extractionResultId: string;
  enrichment?: EnrichExtractionResult;
}

export class ProcessInboxItemUseCase {
  constructor(
    private readonly inboxRepository: InboxRepositoryPort,
    private readonly aiService: AIServicePort,
    private readonly extractionResultRepository: ExtractionResultRepositoryPort,
    private readonly enrichExtractionUseCase: EnrichExtractionUseCase,
  ) {}

  async execute(input: ProcessInboxItemInput): Promise<ProcessInboxItemOutput> {
    const item = await this.inboxRepository.findById(input.inboxItemId);

    if (!item) {
      throw new Error(`Inbox item not found: ${input.inboxItemId}`);
    }

    if (item.userId !== input.userId) {
      throw new Error(`Unauthorized access to inbox item: ${input.inboxItemId}`);
    }

    try {
      const media = parseInboxMedia(item.channel, item.channelMeta);
      let rawContent = item.rawContent;
      const extractionOptions: AIExtractionOptions = {
        referenceDate: new Date(),
      };

      if (media?.contentType === "IMAGE") {
        extractionOptions.media = {
          type: "image",
          mimeType: media.mimeType,
          base64: media.base64,
        };

        if (!rawContent.trim() || isMediaPlaceholder(rawContent)) {
          rawContent = "Analise o comprovante anexo e extraia os dados financeiros.";
        }
      } else if (media && (media.contentType === "VOICE" || media.contentType === "AUDIO")) {
        const transcription = await this.aiService.transcribeAudio({
          type: "audio",
          mimeType: media.mimeType,
          base64: media.base64,
        });

        rawContent = transcription;
      }

      const { data, metadata } = await this.aiService.extract(rawContent, extractionOptions);

      const enrichment = await this.enrichExtractionUseCase.execute({
        userId: input.userId,
        extraction: data,
        rawContent,
      });

      // Se o webhook do Telegram (ou outro) já pré-categorizou via CategoryRuleEngine, injetamos aqui
      const channelMeta = item.channelMeta as Record<string, any>;
      if (channelMeta && channelMeta.categoryId && !enrichment.extraction.categoryId) {
        enrichment.extraction.categoryId = channelMeta.categoryId as string;
        enrichment.extraction.confidence.categoryId = 1.0;
        enrichment.overriddenFields.push("categoryId");
        enrichment.overriddenCriticalFields.push("categoryId");
        enrichment.fieldSources["categoryId"] = "rule"; // Mapeado via Camada 1
      }

      const enrichedExtraction = enrichment.extraction;
      const status = this.resolveStatus(enrichedExtraction, enrichment);
      const confidence = this.toExtractionConfidence(enrichedExtraction, enrichment);

      const { id: extractionResultId } = await this.extractionResultRepository.save({
        inboxItemId: input.inboxItemId,
        provider: metadata.provider,
        extractedData: enrichedExtraction,
        confidence,
        tokensUsed: metadata.tokensUsed,
        processingMs: metadata.processingMs,
      });

      await this.inboxRepository.updateStatus(input.inboxItemId, status);

      return {
        status,
        extraction: enrichedExtraction,
        extractionResultId,
        enrichment,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI extraction failed unexpectedly";

      await this.inboxRepository.updateStatus(input.inboxItemId, "ERROR", message);

      throw new Error(message);
    }
  }

  private resolveStatus(
    extraction: FinancialExtraction,
    enrichment: EnrichExtractionResult,
  ): InboxStatus {
    if (enrichment.overriddenCriticalFields.length > 0 && !this.needsConfirmation(extraction)) {
      return "READY";
    }

    if (this.needsConfirmation(extraction)) {
      return "NEEDS_CONFIRMATION";
    }

    return "READY";
  }

  private needsConfirmation(extraction: FinancialExtraction): boolean {
    if (extraction.amount === null) {
      return true;
    }

    if (extraction.type === "UNKNOWN") {
      return true;
    }

    for (const field of CRITICAL_FIELDS) {
      const score = extraction.confidence[field] ?? 0;
      if (score < CONFIDENCE_THRESHOLD) {
        return true;
      }
    }

    if (
      extraction.missingFields.some((field) =>
        CRITICAL_FIELDS.includes(field as (typeof CRITICAL_FIELDS)[number]),
      )
    ) {
      return true;
    }

    return false;
  }

  private toExtractionConfidence(
    extraction: FinancialExtraction,
    enrichment: EnrichExtractionResult,
  ): ExtractionConfidence {
    const fieldKeys = [
      "type",
      "amount",
      "description",
      "category",
      "categoryId",
      "date",
      "paymentMethod",
      "paymentMethodType",
      "financialInstitution",
      "cardLastFourDigits",
      "cardBrand",
      "installments",
      "financialAccountId",
      "paymentMethodId",
      "cardId",
    ] as const;
    const fields: Record<string, FieldConfidence> = {};

    for (const key of fieldKeys) {
      const enrichmentSource = enrichment.fieldSources[key];
      fields[key] = {
        value: extraction[key],
        score: extraction.confidence[key] ?? 0,
        source: enrichmentSource ?? "llm",
      };
    }

    const scores = Object.values(extraction.confidence);
    const overall =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    return { overall, fields };
  }
}
