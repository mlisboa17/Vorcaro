import type { PrismaClient } from "@prisma/client";
import { handleInboxBulkApplySuggestions } from "@/lib/inbox/handle-inbox-bulk-apply-suggestions";
import { handleInboxBulkConfirm } from "@/lib/inbox/handle-inbox-bulk-confirm";
import { InboxLearningService } from "@/modules/inbox-intelligence/application/services/inbox-learning.service";
import { InboxClassificationService } from "@/modules/inbox-intelligence/application/services/inbox-classification.service";
import { readClassificationFromExtraction } from "@/lib/inbox/apply-inbox-classification";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";

export type SmartBatchExecuteResult = {
  applied: number;
  confirmed: number;
  skipped: number;
  failed: number;
  confirmedIds: string[];
  failedItems: Array<{ id: string; reason: string }>;
  feedbackRecorded: number;
};

export async function handleInboxSmartBatchExecute(
  prisma: PrismaClient,
  userId: string,
  inboxItemIds: string[],
  options: { recordFeedback?: boolean } = {},
): Promise<SmartBatchExecuteResult> {
  const recordFeedback = options.recordFeedback ?? true;
  const applyResult = await handleInboxBulkApplySuggestions(prisma, userId, inboxItemIds);
  const confirmResult = await handleInboxBulkConfirm(prisma, userId, inboxItemIds);

  let feedbackRecorded = 0;

  if (recordFeedback && confirmResult.confirmedIds.length > 0) {
    const learning = new InboxLearningService(prisma);
    const extractionRepo = new PrismaExtractionResultRepository(prisma);
    const classifier = new InboxClassificationService(prisma);

    for (const inboxItemId of confirmResult.confirmedIds) {
      const item = await prisma.financialInbox.findFirst({
        where: { id: inboxItemId, userId },
        select: { rawContent: true },
      });

      if (!item) continue;

      const extractionRow = await extractionRepo.findLatestByInboxItemId(inboxItemId);
      const extraction = extractionRow?.extractedData as FinancialExtraction | undefined;
      const embedded = readClassificationFromExtraction(extraction);
      const chosenCategoryId = extraction?.categoryId;

      if (!chosenCategoryId) continue;

      let suggestedCategoryId = embedded?.categoryId ?? null;
      if (!suggestedCategoryId) {
        const suggestion = await classifier.classify({
          userId,
          description: item.rawContent,
        });
        suggestedCategoryId = suggestion.categoryId;
      }

      const feedback = await learning.recordCategoryFeedback({
        userId,
        description: item.rawContent,
        suggestedCategoryId,
        chosenCategoryId,
        chosenCategoryName: extraction?.category ?? embedded?.categoryName ?? undefined,
      });

      if (feedback.recorded) {
        feedbackRecorded += 1;
      }
    }
  }

  return {
    applied: applyResult.applied,
    confirmed: confirmResult.confirmed,
    skipped: confirmResult.skipped + applyResult.skipped,
    failed: confirmResult.failed + applyResult.failed,
    confirmedIds: confirmResult.confirmedIds,
    failedItems: [...applyResult.failedItems, ...confirmResult.failedItems],
    feedbackRecorded,
  };
}
