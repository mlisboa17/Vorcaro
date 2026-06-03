import type { FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { ExtractionConfidence } from "@/modules/shared/domain/confidence";

export interface SaveExtractionResultInput {
  inboxItemId: string;
  provider: string;
  extractedData: FinancialExtraction;
  confidence: ExtractionConfidence;
  tokensUsed?: number;
  processingMs?: number;
}

export interface ExtractionResultRecord {
  id: string;
  inboxItemId: string;
  provider: string;
  extractedData: FinancialExtraction;
  confidence: ExtractionConfidence;
  tokensUsed: number | null;
  processingMs: number | null;
  createdAt: Date;
}

export interface ExtractionResultRepositoryPort {
  save(input: SaveExtractionResultInput): Promise<{ id: string }>;
  findLatestByInboxItemId(inboxItemId: string): Promise<ExtractionResultRecord | null>;
  findLatestOrCreateFromImport(
    inboxItemId: string,
    userId: string,
  ): Promise<ExtractionResultRecord | null>;
  updateExtractedData(id: string, extractedData: FinancialExtraction): Promise<void>;
}
