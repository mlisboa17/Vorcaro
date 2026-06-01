import type { PrismaClient } from "@prisma/client";
import { BatchInboxError } from "@/modules/financial-inbox/application/errors/batch-inbox.error";
import { BatchUpdateInboxItemsUseCase } from "@/modules/financial-inbox/application/use-cases/batch-update-inbox-items.use-case";
import type { InboxBulkUpdatePatch } from "@/modules/financial-inbox/domain/schemas/inbox-bulk-update-api.schema";
import { mapBulkUpdatePatchToPendingCorrections } from "@/modules/financial-inbox/domain/schemas/inbox-bulk-update-api.schema";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";

export async function handleInboxBulkUpdate(
  prisma: PrismaClient,
  userId: string,
  inboxItemIds: string[],
  patch: InboxBulkUpdatePatch,
) {
  const useCase = new BatchUpdateInboxItemsUseCase(
    new PrismaInboxRepository(prisma),
    new PrismaExtractionResultRepository(prisma),
    new PrismaFinancialAccountRepository(prisma),
    new PrismaCategoryRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
  );

  const result = await useCase.execute({
    userId,
    inboxItemIds,
    patch: mapBulkUpdatePatchToPendingCorrections(patch),
  });

  return {
    updated: result.updated.length,
    skipped: result.skipped.length,
    failed: result.failed.length,
    updatedIds: result.updated,
    failedItems: result.failed,
    skippedIds: result.skipped,
  };
}

export { BatchInboxError };
