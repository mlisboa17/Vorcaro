import type { PrismaClient } from "@prisma/client";
import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import { ConfirmTransactionError } from "@/modules/financial-inbox/application/errors/confirm-transaction.error";
import { parseInboxImportLineMetadata } from "@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { buildExtractionFromImportInbox } from "@/lib/inbox/build-import-inbox-extraction";

export async function ensureInboxExtractionForConfirm(
  prisma: PrismaClient,
  inboxItemId: string,
  userId: string,
): Promise<{ extractedData: FinancialExtraction; created: boolean }> {
  const extractionRepo = new PrismaExtractionResultRepository(prisma);
  const existing = await extractionRepo.findLatestByInboxItemId(inboxItemId);

  if (existing) {
    return { extractedData: existing.extractedData, created: false };
  }

  const item = await prisma.financialInbox.findFirst({
    where: { id: inboxItemId, userId },
    select: { id: true, userId: true, rawContent: true, metadata: true, channel: true },
  });

  if (!item) {
    throw new ConfirmTransactionError("Inbox item not found", "NOT_FOUND");
  }

  const meta = parseInboxImportLineMetadata(item.metadata);
  if (item.channel !== "WEB_IMPORT" || !meta?.bulkImport) {
    throw new ConfirmTransactionError("No extraction result found for inbox item", "VALIDATION");
  }

  const extractedData = buildExtractionFromImportInbox(
    { id: item.id, userId: item.userId, rawContent: item.rawContent, metadata: item.metadata },
    meta,
  );

  await extractionRepo.save({
    inboxItemId,
    provider: "import",
    extractedData,
    confidence: { overall: 1, fields: {} },
  });

  return { extractedData, created: true };
}
