import type { PrismaClient } from "@prisma/client";
import { handleInboxBulkUpdate } from "@/lib/inbox/handle-inbox-bulk-update";
import { readClassificationFromExtraction } from "@/lib/inbox/apply-inbox-classification";
import { InboxClassificationService } from "@/modules/inbox-intelligence/application/services/inbox-classification.service";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";

export async function handleInboxBulkApplySuggestions(
  prisma: PrismaClient,
  userId: string,
  inboxItemIds: string[],
) {
  const extractionRepo = new PrismaExtractionResultRepository(prisma);
  const classifier = new InboxClassificationService(prisma);

  const applied: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const inboxItemId of inboxItemIds) {
    const item = await prisma.financialInbox.findFirst({
      where: { id: inboxItemId, userId },
      select: { id: true, rawContent: true, status: true },
    });

    if (!item) {
      failed.push({ id: inboxItemId, reason: "Item não encontrado" });
      continue;
    }

    if (item.status === "SAVED") {
      skipped.push(inboxItemId);
      continue;
    }

    const extractionRow = await extractionRepo.findLatestByInboxItemId(inboxItemId);
    let suggestion = readClassificationFromExtraction(
      extractionRow?.extractedData as FinancialExtraction | undefined,
    );

    if (!suggestion?.categoryId) {
      suggestion = await classifier.classify({
        userId,
        description: item.rawContent,
      });
    }

    if (!suggestion.categoryId) {
      failed.push({ id: inboxItemId, reason: "Sem categoria sugerida" });
      continue;
    }

    try {
      await handleInboxBulkUpdate(prisma, userId, [inboxItemId], {
        categoriaId: suggestion.categoryId,
      });
      applied.push(inboxItemId);
    } catch (error) {
      failed.push({
        id: inboxItemId,
        reason: error instanceof Error ? error.message : "Falha ao aplicar",
      });
    }
  }

  return {
    applied: applied.length,
    skipped: skipped.length,
    failed: failed.length,
    appliedIds: applied,
    failedItems: failed,
  };
}
