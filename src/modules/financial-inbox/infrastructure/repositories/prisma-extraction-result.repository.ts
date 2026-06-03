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
import { buildExtractionFromImportInbox } from "@/lib/inbox/build-import-inbox-extraction";
import { parseInboxImportLineMetadata } from "../../domain/schemas/inbox-import-metadata.schema";

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

  async findLatestOrCreateFromImport(
    inboxItemId: string,
    userId: string,
  ): Promise<ExtractionResultRecord | null> {
    const latest = await this.findLatestByInboxItemId(inboxItemId);
    if (latest) {
      return latest;
    }

    const item = await this.db.financialInbox.findFirst({
      where: { id: inboxItemId, userId },
      select: { id: true, userId: true, rawContent: true, metadata: true, channel: true },
    });

    if (!item || item.channel !== "WEB_IMPORT") {
      return null;
    }

    const meta = parseInboxImportLineMetadata(item.metadata);
    if (!meta?.bulkImport) {
      return null;
    }

    const extractedData = buildExtractionFromImportInbox(
      { id: item.id, userId: item.userId, rawContent: item.rawContent, metadata: item.metadata },
      meta,
    );

    const saved = await this.save({
      inboxItemId,
      provider: "import",
      extractedData,
      confidence: { overall: 1, fields: {} },
    });

    return {
      id: saved.id,
      inboxItemId,
      provider: "import",
      extractedData,
      confidence: { overall: 1, fields: {} },
      tokensUsed: null,
      processingMs: null,
      createdAt: new Date(),
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
