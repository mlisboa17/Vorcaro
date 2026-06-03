import type { PrismaClient } from "@prisma/client";
import { BatchConfirmInboxItemsUseCase } from "@/modules/financial-inbox/application/use-cases/batch-confirm-inbox-items.use-case";
import { ConfirmAndCreateTransactionUseCase } from "@/modules/financial-inbox/application/use-cases/confirm-and-create-transaction.use-case";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

export function createConfirmInboxUseCase(prisma: PrismaClient) {
  return new ConfirmAndCreateTransactionUseCase(
    new PrismaInboxRepository(prisma),
    new PrismaExtractionResultRepository(prisma),
    new PrismaTransactionRepository(prisma),
    new PrismaFinancialAccountRepository(prisma),
    new PrismaCategoryRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
    new PrismaUserLearningPatternRepository(prisma),
  );
}

export async function handleInboxBulkConfirm(
  prisma: PrismaClient,
  userId: string,
  inboxItemIds: string[],
) {
  const useCase = new BatchConfirmInboxItemsUseCase(createConfirmInboxUseCase(prisma));

  const result = await useCase.execute({ userId, inboxItemIds });

  return {
    confirmed: result.confirmed.length,
    skipped: result.skipped.length,
    failed: result.failed.length,
    confirmedIds: result.confirmed,
    skippedIds: result.skipped,
    failedItems: result.failed,
  };
}
