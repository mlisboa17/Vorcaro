import type { PrismaClient } from "@prisma/client";
import { FinancialDocumentClassificationService } from "@/modules/financial-documents/application/services/financial-document-classification.service";
import { FinancialDocumentLearningService } from "@/modules/financial-documents/application/services/financial-document-learning.service";
import { FinancialDocumentOcrService } from "@/modules/financial-documents/application/services/financial-document-ocr.service";
import { FinancialDocumentParserService } from "@/modules/financial-documents/application/services/financial-document-parser.service";
import { FinancialDocumentProcessingService } from "@/modules/financial-documents/application/services/financial-document-processing.service";
import { FinancialDocumentSuggestionService } from "@/modules/financial-documents/application/services/financial-document-suggestion.service";
import { FinancialDocumentUploadService } from "@/modules/financial-documents/application/services/financial-document-upload.service";
import { FinancialDocumentPasswordService } from "@/modules/financial-documents/application/services/financial-document-password.service";
import { FinancialDocumentReprocessService } from "@/modules/financial-documents/application/services/financial-document-reprocess.service";
import { FinancialDocumentLinesConfirmService } from "@/modules/financial-documents/application/services/financial-document-lines-confirm.service";
import { createFinancialOcrProvider } from "@/modules/financial-documents/infrastructure/ocr/create-financial-ocr-provider";
import { PrismaFinancialDocumentRepository } from "@/modules/financial-documents/infrastructure/repositories/prisma-financial-document.repository";

export function buildFinancialDocumentServices(prisma: PrismaClient) {
  const repo = new PrismaFinancialDocumentRepository(prisma);
  const ocrProvider = createFinancialOcrProvider();
  return {
    repo,
    upload: new FinancialDocumentUploadService(prisma),
    ocr: new FinancialDocumentOcrService(ocrProvider),
    parser: new FinancialDocumentParserService(),
    classification: new FinancialDocumentClassificationService(prisma),
    suggestion: new FinancialDocumentSuggestionService(prisma),
    learning: new FinancialDocumentLearningService(prisma),
    processing: new FinancialDocumentProcessingService(prisma),
    password: new FinancialDocumentPasswordService(prisma),
    reprocess: new FinancialDocumentReprocessService(prisma),
    linesConfirm: new FinancialDocumentLinesConfirmService(prisma),
  };
}

export type FinancialDocumentServices = ReturnType<typeof buildFinancialDocumentServices>;
