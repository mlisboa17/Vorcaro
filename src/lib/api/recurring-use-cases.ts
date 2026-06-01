import { prisma } from "@/lib/prisma";
import {
  CreateRecurringTransactionUseCase,
  DeactivateRecurringTransactionUseCase,
  ListRecurringTransactionsUseCase,
  ProcessRecurringTransactionsUseCase,
  UpdateRecurringTransactionUseCase,
} from "@/modules/recurring-transactions/application/use-cases/recurring-transaction.use-cases";
import { PrismaRecurringTransactionRepository } from "@/modules/recurring-transactions/infrastructure/repositories/prisma-recurring-transaction.repository";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";

export function buildRecurringUseCases() {
  const repository = new PrismaRecurringTransactionRepository(prisma);
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const financialAccountRepository = new PrismaFinancialAccountRepository(prisma);
  const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
  const cardRepository = new PrismaCardOwnershipRepository(prisma);

  return {
    list: new ListRecurringTransactionsUseCase(repository),
    create: new CreateRecurringTransactionUseCase(
      repository,
      categoryRepository,
      financialAccountRepository,
      paymentMethodRepository,
      cardRepository,
    ),
    update: new UpdateRecurringTransactionUseCase(
      repository,
      categoryRepository,
      financialAccountRepository,
      paymentMethodRepository,
      cardRepository,
    ),
    deactivate: new DeactivateRecurringTransactionUseCase(repository),
    process: new ProcessRecurringTransactionsUseCase(
      repository,
      paymentMethodRepository,
      cardRepository,
    ),
  };
}
