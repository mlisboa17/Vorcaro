import { prisma } from "@/lib/prisma";
import {
  CancelReceivableUseCase,
  CollectReceivableUseCase,
  CreateReceivableFromTransactionUseCase,
  CreateReceivableUseCase,
  GetReceivableSummaryUseCase,
  ListReceivablesUseCase,
} from "@/modules/receivables/application/use-cases/receivable.use-cases";
import { PrismaReceivableRepository } from "@/modules/receivables/infrastructure/repositories/prisma-receivable.repository";

export function buildReceivableUseCases() {
  const repository = new PrismaReceivableRepository(prisma);

  return {
    repository,
    create: new CreateReceivableUseCase(repository),
    list: new ListReceivablesUseCase(repository),
    getSummary: new GetReceivableSummaryUseCase(repository),
    createFromTransaction: new CreateReceivableFromTransactionUseCase(prisma, repository),
    collect: new CollectReceivableUseCase(prisma, repository),
    cancel: new CancelReceivableUseCase(repository),
  };
}

export function parseReceivableDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}
