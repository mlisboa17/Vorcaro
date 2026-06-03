import type { PrismaClient } from "@prisma/client";
import type {
  InstallmentReadModelRepositoryPort,
  InstallmentTransactionRecord,
} from "../domain/ports/installment-read-model.port";
import { resolveInstallmentGroupKey } from "../domain/installment-read-rules";

const installmentSelect = {
  id: true,
  description: true,
  amount: true,
  type: true,
  date: true,
  dataCaixa: true,
  dataVencimentoFatura: true,
  installmentGroup: true,
  idGrupoParcelamento: true,
  numeroParcela: true,
  currentInstallment: true,
  totalParcelas: true,
  totalInstallments: true,
  installments: true,
  category: { select: { name: true } },
  card: { select: { id: true, name: true } },
} as const;

export class PrismaInstallmentReadRepository implements InstallmentReadModelRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findInstallmentTransactions(userId: string): Promise<InstallmentTransactionRecord[]> {
    const [structured, unstructuredCandidates] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          OR: [{ installmentGroup: { not: null } }, { idGrupoParcelamento: { not: null } }],
        },
        select: installmentSelect,
        orderBy: [{ date: "asc" }, { numeroParcela: "asc" }],
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          installmentGroup: null,
          idGrupoParcelamento: null,
          OR: [
            { totalParcelas: { gt: 1 } },
            { totalInstallments: { gt: 1 } },
            { numeroParcela: { gt: 1 } },
            { currentInstallment: { gt: 1 } },
            { description: { contains: "/" } },
          ],
        },
        select: installmentSelect,
        orderBy: [{ date: "asc" }, { numeroParcela: "asc" }],
      }),
    ]);

    const byId = new Map<string, InstallmentTransactionRecord>();
    for (const tx of [...structured, ...unstructuredCandidates]) {
      byId.set(tx.id, tx);
    }

    return [...byId.values()].sort((left, right) => {
      const dateDiff = left.date.getTime() - right.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return (left.numeroParcela ?? 0) - (right.numeroParcela ?? 0);
    });
  }

  async findTransactionsByGroup(
    userId: string,
    groupId: string,
  ): Promise<InstallmentTransactionRecord[]> {
    if (groupId.startsWith("unstruct_")) {
      const all = await this.findInstallmentTransactions(userId);
      return all.filter((tx) => resolveInstallmentGroupKey(tx)?.key === groupId);
    }

    return this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ installmentGroup: groupId }, { idGrupoParcelamento: groupId }],
      },
      select: installmentSelect,
      orderBy: [{ numeroParcela: "asc" }, { date: "asc" }],
    });
  }

  async existsGroupForOtherUser(groupId: string, userId: string): Promise<boolean> {
    const found = await this.prisma.transaction.findFirst({
      where: {
        userId: { not: userId },
        OR: [{ installmentGroup: groupId }, { idGrupoParcelamento: groupId }],
      },
      select: { id: true },
    });
    return found != null;
  }
}
