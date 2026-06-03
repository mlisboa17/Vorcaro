import type { TransactionType } from "@prisma/client";

export interface TransactionInput {
  userId: string;
  accountId?: string;
  amount: number;
  description: string;
  type: TransactionType;
  date: Date;
  dataCompra?: Date;
  dataCaixa?: Date;
  dataVencimentoFatura?: Date;
  categoryId?: string;
  paymentMethodId?: string;
  cardId?: string;
  inboxItemId?: string;
  installments?: number;
  installmentGroup?: string;
  currentInstallment?: number;
  totalInstallments?: number;
  numeroParcela?: number;
  totalParcelas?: number;
  idGrupoParcelamento?: string;
  observacoesInternas?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  lancamentoRecorrenteId?: string;
  dataRecorrencia?: Date;
  liabilityId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  cardId: string | null;
  inboxItemId: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  dataCompra: Date | null;
  dataCaixa: Date | null;
  dataVencimentoFatura: Date | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  installments: number;
  installmentGroup: string | null;
  currentInstallment: number | null;
  totalInstallments: number | null;
  numeroParcela: number | null;
  totalParcelas: number | null;
  idGrupoParcelamento: string | null;
  observacoesInternas: string | null;
  lancamentoRecorrenteId: string | null;
  dataRecorrencia: Date | null;
  liabilityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRelationSnapshot {
  id: string;
  name: string;
}

export interface TransactionWithRelations extends Transaction {
  account: TransactionRelationSnapshot | null;
  category: TransactionRelationSnapshot | null;
  paymentMethod: TransactionRelationSnapshot | null;
  card: TransactionRelationSnapshot | null;
}

export interface ListTransactionsFilters {
  accountId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ListTransactionsResult {
  items: TransactionWithRelations[];
  total: number;
}

export interface UpdateTransactionData {
  description: string;
  amount: number;
  type: TransactionType;
  date: Date;
  categoryId: string | null;
  accountId: string | null;
  paymentMethodId: string;
  cardId: string | null;
  installments: number;
  liabilityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface BulkUpdateTransactionPatch {
  categoryId?: string;
  accountId?: string;
  paymentMethodId?: string;
  cardId?: string | null;
  liabilityId?: string | null;
  date?: Date;
  dataCaixa?: Date;
  dataCompra?: Date;
}

export interface FindDuplicateInstallmentInput {
  userId: string;
  cardId: string | null;
  descricaoBase: string;
  numeroParcela: number;
  totalParcelas: number;
  valor: number;
  date: string;
}

export interface TransactionRepositoryPort {
  save(input: TransactionInput): Promise<Transaction>;
  findDuplicateInstallmentTransaction(
    input: FindDuplicateInstallmentInput,
  ): Promise<Transaction | null>;
  saveMany(inputs: TransactionInput[]): Promise<Transaction[]>;
  findByIdForUser(id: string, userId: string): Promise<Transaction | null>;
  findByIdWithRelationsForUser(
    id: string,
    userId: string,
  ): Promise<TransactionWithRelations | null>;
  listByUserId(userId: string, filters?: ListTransactionsFilters): Promise<ListTransactionsResult>;
  listIdsByUserId(userId: string, filters?: ListTransactionsFilters): Promise<string[]>;
  countByIdsForUser(userId: string, transactionIds: string[]): Promise<number>;
  bulkUpdateForUser(
    userId: string,
    transactionIds: string[],
    patch: BulkUpdateTransactionPatch,
    auditFields: string[],
  ): Promise<number>;
  updateById(
    id: string,
    userId: string,
    data: UpdateTransactionData,
  ): Promise<TransactionWithRelations | null>;
  deleteById(id: string, userId: string): Promise<Transaction | null>;
}
