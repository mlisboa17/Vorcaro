import type { PrismaClient } from "@prisma/client";
import { analyzeFinancialDocumentText } from "@/modules/financial-documents/domain/services/financial-document-import-analyzer.service";
import type { FinancialDocumentBatchReview } from "@/modules/financial-documents/domain/types/financial-document-import.types";
import {
  resolveBankStatementWithLayoutHint,
  StatementLayoutTrainingService,
} from "./statement-layout-training.service";
import { mapParserStatementToBatchReview } from "@/modules/financial-documents/domain/services/bank-statement-batch.mapper";
import { isBradescoBankStatementText } from "@/lib/inbox/bradesco-bank-statement-parser";
import { parseBradescoStatementFull } from "@/lib/inbox/bradesco-statement-line-parser";

export async function analyzeDocumentWithLayoutTraining(
  db: PrismaClient,
  input: {
    userId: string;
    text: string;
    fileName?: string;
    cardId?: string | null;
  },
): Promise<FinancialDocumentBatchReview> {
  const training = new StatementLayoutTrainingService(db);
  let layoutContext: Awaited<ReturnType<StatementLayoutTrainingService["matchForImport"]>>;

  try {
    layoutContext = await training.matchForImport({
      userId: input.userId,
      content: input.text,
      fileName: input.fileName,
      fileFormat: "PDF",
    });
  } catch {
    return analyzeFinancialDocumentText(input.text, {
      userId: input.userId,
      cardId: input.cardId,
      fileName: input.fileName,
    });
  }

  let review = analyzeFinancialDocumentText(input.text, {
    userId: input.userId,
    cardId: input.cardId,
    fileName: input.fileName,
  });

  if (review.documentKind === "BANK_STATEMENT" && layoutContext.match.similarityTier !== "LOW") {
    const resolved = resolveBankStatementWithLayoutHint(input.text, layoutContext.match);
    const remapped = mapParserStatementToBatchReview(resolved.statement, {
      userId: input.userId,
      cardId: input.cardId,
    });
    review = {
      ...review,
      ...remapped,
      documentKind: "BANK_STATEMENT",
      batchReviewRequired: true,
      usedGenericParser: resolved.usedGenericFallback,
    };

    if (isBradescoBankStatementText(input.text)) {
      const bradescoFull = parseBradescoStatementFull(input.text);
      review.importSummary = {
        totalLines: bradescoFull.summary.total,
        recognized: bradescoFull.summary.recognized,
        needsReview: bradescoFull.summary.needsReview,
        ignored: bradescoFull.summary.ignored,
        errors: bradescoFull.summary.errors,
        processedInChunks: bradescoFull.processedInChunks,
      };
    }
  }

  if (review.documentKind === "BANK_STATEMENT") {
    review.bankStatementTransactions = training.applyTrainingToDocumentLines(
      review.bankStatementTransactions,
      layoutContext,
    );

    const ensured = await training.ensureModelAfterFirstImport({
      userId: input.userId,
      content: input.text,
      fileName: input.fileName,
      fileFormat: "PDF",
      match: layoutContext.match,
    });

    review.layoutTraining = {
      modelId: ensured.modelId,
      modelVersion: ensured.modelVersion,
      layoutLabel: ensured.layoutLabel,
      similarityScore: ensured.similarityScore,
      similarityTier: ensured.similarityTier,
      isNewModel: ensured.isNewModel,
      message: ensured.message,
    };

    if (ensured.message) {
      review.warnings = [...(review.warnings ?? []), ensured.message];
    }
  }

  return review;
}
