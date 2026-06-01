import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type {
  ExtractionResultRecord,
  ExtractionResultRepositoryPort,
  SaveExtractionResultInput,
} from "../../domain/ports/extraction-result-repository.port";
import { parseFinancialExtraction } from "../../domain/schemas/financial-extraction.schema";
import type { FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { ExtractionConfidence } from "@/modules/shared/domain/confidence";

function parseConfidence(data: unknown): ExtractionConfidence {
  if (!data || typeof data !== "object") {
    return { overall: 0, fields: {} };
  }

  const record = data as ExtractionConfidence;
  return {
    overall: typeof record.overall === "number" ? record.overall : 0,
    fields: record.fields ?? {},
  };
}

export class PrismaExtractionResultRepository implements ExtractionResultRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async save(input: SaveExtractionResultInput): Promise<{ id: string }> {
    const result = await this.db.extractionResult.create({
      data: {
        inboxItemId: input.inboxItemId,
        provider: input.provider,
        extractedData: input.extractedData as unknown as Prisma.InputJsonValue,
        confidence: input.confidence as unknown as Prisma.InputJsonValue,
        tokensUsed: input.tokensUsed,
        processingMs: input.processingMs,
      },
      select: { id: true },
    });

    return { id: result.id };
  }

  async findLatestByInboxItemId(inboxItemId: string): Promise<ExtractionResultRecord | null> {
    const result = await this.db.extractionResult.findFirst({
      where: { inboxItemId },
      orderBy: { createdAt: "desc" },
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      inboxItemId: result.inboxItemId,
      provider: result.provider,
      extractedData: parseFinancialExtraction(result.extractedData),
      confidence: parseConfidence(result.confidence),
      tokensUsed: result.tokensUsed,
      processingMs: result.processingMs,
      createdAt: result.createdAt,
    };
  }

  async updateExtractedData(id: string, extractedData: FinancialExtraction): Promise<void> {
    await this.db.extractionResult.update({
      where: { id },
      data: {
        extractedData: extractedData as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
