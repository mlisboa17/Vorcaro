import type { TransactionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type InstallmentTransactionRecord = {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  type: TransactionType;
  date: Date;
  dataCaixa: Date | null;
  dataVencimentoFatura: Date | null;
  installmentGroup: string | null;
  idGrupoParcelamento: string | null;
  numeroParcela: number | null;
  currentInstallment: number | null;
  totalParcelas: number | null;
  totalInstallments: number | null;
  installments: number;
  category: { name: string } | null;
  card: { id: string; name: string } | null;
};

export interface InstallmentReadModelRepositoryPort {
  findInstallmentTransactions(userId: string): Promise<InstallmentTransactionRecord[]>;
  findTransactionsByGroup(
    userId: string,
    groupId: string,
  ): Promise<InstallmentTransactionRecord[]>;
  existsGroupForOtherUser(groupId: string, userId: string): Promise<boolean>;
}
