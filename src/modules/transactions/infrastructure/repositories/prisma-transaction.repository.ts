import type { Prisma, PrismaClient } from "@prisma/client";
import { buildEffectiveDateRangeFilter } from "@/modules/financial/core/effective-date-filter";
import type {
  BulkUpdateTransactionPatch,
  ListTransactionsFilters,
  ListTransactionsResult,
  Transaction,
  TransactionInput,
  TransactionRepositoryPort,
  TransactionWithRelations,
  UpdateTransactionData,
} from "../../domain/ports/transaction-repository.port";

const MAX_BULK_IDS = 500;
const MAX_FILTERED_IDS = 5000;

const RELATION_SELECT = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  paymentMethod: { select: { id: true, name: true } },
  card: { select: { id: true, name: true } },
} as const;

function mapTransactionInputToCreateData(input: TransactionInput): Prisma.TransactionCreateInput {
  return {
    user: { connect: { id: input.userId } },
    ...(input.accountId ? { account: { connect: { id: input.accountId } } } : {}),
    ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
    ...(input.paymentMethodId
      ? { paymentMethod: { connect: { id: input.paymentMethodId } } }
      : {}),
    ...(input.cardId ? { card: { connect: { id: input.cardId } } } : {}),
    ...(input.inboxItemId ? { inboxItem: { connect: { id: input.inboxItemId } } } : {}),
    ...(input.lancamentoRecorrenteId
      ? { lancamentoRecorrente: { connect: { id: input.lancamentoRecorrenteId } } }
      : {}),
    ...(input.liabilityId ? { liability: { connect: { id: input.liabilityId } } } : {}),
    type: input.type,
    amount: input.amount,
    description: input.description,
    date: input.date,
    dataCompra: input.dataCompra,
    dataCaixa: input.dataCaixa,
    dataVencimentoFatura: input.dataVencimentoFatura,
    notes: input.notes,
    metadata: input.metadata as Prisma.InputJsonValue | undefined,
    installments: input.installments ?? 1,
    installmentGroup: input.installmentGroup ?? input.idGrupoParcelamento,
    currentInstallment: input.currentInstallment ?? input.numeroParcela,
    totalInstallments: input.totalInstallments ?? input.totalParcelas,
    numeroParcela: input.numeroParcela ?? input.currentInstallment,
    totalParcelas: input.totalParcelas ?? input.totalInstallments,
    idGrupoParcelamento: input.idGrupoParcelamento ?? input.installmentGroup,
    observacoesInternas: input.observacoesInternas,
    dataRecorrencia: input.dataRecorrencia,
  };
}

function toTransaction(record: {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  cardId: string | null;
  inboxItemId: string | null;
  type: Transaction["type"];
  amount: Prisma.Decimal;
  description: string;
  date: Date;
  dataCompra: Date | null;
  dataCaixa: Date | null;
  dataVencimentoFatura: Date | null;
  notes: string | null;
  metadata: Prisma.JsonValue;
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
}): Transaction {
  return {
    id: record.id,
    userId: record.userId,
    accountId: record.accountId,
    categoryId: record.categoryId,
    paymentMethodId: record.paymentMethodId,
    cardId: record.cardId,
    inboxItemId: record.inboxItemId,
    type: record.type,
    amount: record.amount.toNumber(),
    description: record.description,
    date: record.date,
    dataCompra: record.dataCompra,
    dataCaixa: record.dataCaixa,
    dataVencimentoFatura: record.dataVencimentoFatura,
    notes: record.notes,
    metadata:
      typeof record.metadata === "object" && record.metadata !== null && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : null,
    installments: record.installments,
    installmentGroup: record.installmentGroup ?? record.idGrupoParcelamento,
    currentInstallment: record.currentInstallment ?? record.numeroParcela,
    totalInstallments: record.totalInstallments ?? record.totalParcelas,
    numeroParcela: record.numeroParcela ?? record.currentInstallment,
    totalParcelas: record.totalParcelas ?? record.totalInstallments,
    idGrupoParcelamento: record.idGrupoParcelamento ?? record.installmentGroup,
    observacoesInternas: record.observacoesInternas,
    lancamentoRecorrenteId: record.lancamentoRecorrenteId,
    dataRecorrencia: record.dataRecorrencia,
    liabilityId: record.liabilityId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toTransactionWithRelations(record: {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  cardId: string | null;
  inboxItemId: string | null;
  type: Transaction["type"];
  amount: Prisma.Decimal;
  description: string;
  date: Date;
  dataCompra: Date | null;
  dataCaixa: Date | null;
  dataVencimentoFatura: Date | null;
  notes: string | null;
  metadata: Prisma.JsonValue;
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
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  paymentMethod: { id: string; name: string } | null;
  card: { id: string; name: string } | null;
}): TransactionWithRelations {
  return {
    ...toTransaction(record),
    account: record.account,
    category: record.category,
    paymentMethod: record.paymentMethod,
    card: record.card,
  };
}

function buildWhere(userId: string, filters: ListTransactionsFilters = {}): Prisma.TransactionWhereInput {
  const effectiveDateFilter = buildEffectiveDateRangeFilter(filters.startDate, filters.endDate);

  return {
    userId,
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(effectiveDateFilter ?? {}),
  };
}

export class PrismaTransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async save(input: TransactionInput): Promise<Transaction> {
    const record = await this.db.transaction.create({
      data: mapTransactionInputToCreateData(input),
    });

    return toTransaction(record);
  }

  async saveMany(inputs: TransactionInput[]): Promise<Transaction[]> {
    if (inputs.length === 0) {
      return [];
    }

    const records = await this.db.$transaction(
      inputs.map((entry) =>
        this.db.transaction.create({
          data: mapTransactionInputToCreateData(entry),
        }),
      ),
    );

    return records.map(toTransaction);
  }

  async findByIdForUser(id: string, userId: string): Promise<Transaction | null> {
    const record = await this.db.transaction.findFirst({
      where: { id, userId },
    });

    return record ? toTransaction(record) : null;
  }

  async findByIdWithRelationsForUser(
    id: string,
    userId: string,
  ): Promise<TransactionWithRelations | null> {
    const record = await this.db.transaction.findFirst({
      where: { id, userId },
      include: RELATION_SELECT,
    });

    return record ? toTransactionWithRelations(record) : null;
  }

  async listByUserId(
    userId: string,
    filters: ListTransactionsFilters = {},
  ): Promise<ListTransactionsResult> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);
    const where = buildWhere(userId, filters);

    const [records, total] = await Promise.all([
      this.db.transaction.findMany({
        where,
        include: RELATION_SELECT,
        orderBy: [{ dataCaixa: "desc" }, { date: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.db.transaction.count({ where }),
    ]);

    return {
      items: records.map(toTransactionWithRelations),
      total,
    };
  }

  async listIdsByUserId(userId: string, filters: ListTransactionsFilters = {}): Promise<string[]> {
    const where = buildWhere(userId, filters);
    const records = await this.db.transaction.findMany({
      where,
      select: { id: true },
      orderBy: [{ dataCaixa: "desc" }, { date: "desc" }],
      take: MAX_FILTERED_IDS,
    });

    return records.map((record) => record.id);
  }

  async countByIdsForUser(userId: string, transactionIds: string[]): Promise<number> {
    if (transactionIds.length === 0) {
      return 0;
    }

    return this.db.transaction.count({
      where: {
        userId,
        id: { in: transactionIds },
      },
    });
  }

  async bulkUpdateForUser(
    userId: string,
    transactionIds: string[],
    patch: BulkUpdateTransactionPatch,
    auditFields: string[],
  ): Promise<number> {
    const uniqueIds = [...new Set(transactionIds)];

    if (uniqueIds.length === 0 || uniqueIds.length > MAX_BULK_IDS) {
      return 0;
    }

    const scalarData: Prisma.TransactionUncheckedUpdateManyInput = {};

    if (patch.categoryId !== undefined) {
      scalarData.categoryId = patch.categoryId;
    }

    if (patch.accountId !== undefined) {
      scalarData.accountId = patch.accountId;
    }

    if (patch.paymentMethodId !== undefined) {
      scalarData.paymentMethodId = patch.paymentMethodId;
    }

    if (patch.cardId !== undefined) {
      scalarData.cardId = patch.cardId;
    }

    if (patch.liabilityId !== undefined) {
      scalarData.liabilityId = patch.liabilityId;
    }

    if (patch.date !== undefined) {
      scalarData.date = patch.date;
    }

    if (patch.dataCaixa !== undefined) {
      scalarData.dataCaixa = patch.dataCaixa;
    }

    if (patch.dataCompra !== undefined) {
      scalarData.dataCompra = patch.dataCompra;
    }

    await this.db.$transaction(async (tx) => {
      const ownedCount = await tx.transaction.count({
        where: { userId, id: { in: uniqueIds } },
      });

      if (ownedCount !== uniqueIds.length) {
        throw new Error("BULK_UPDATE_OWNERSHIP_MISMATCH");
      }

      if (Object.keys(scalarData).length > 0) {
        await tx.transaction.updateMany({
          where: { userId, id: { in: uniqueIds } },
          data: scalarData,
        });
      }

      if (auditFields.length === 0) {
        return;
      }

      const rows = await tx.transaction.findMany({
        where: { userId, id: { in: uniqueIds } },
        select: { id: true, metadata: true },
      });

      const bulkUpdatedAt = new Date().toISOString();

      for (const row of rows) {
        const base =
          typeof row.metadata === "object" &&
          row.metadata !== null &&
          !Array.isArray(row.metadata)
            ? { ...(row.metadata as Record<string, unknown>) }
            : {};

        await tx.transaction.update({
          where: { id: row.id },
          data: {
            metadata: {
              ...base,
              bulkUpdate: true,
              updatedFields: auditFields,
              bulkUpdatedAt,
            } as Prisma.InputJsonValue,
          },
        });
      }
    });

    return uniqueIds.length;
  }

  async updateById(
    id: string,
    userId: string,
    data: UpdateTransactionData,
  ): Promise<TransactionWithRelations | null> {
    const existing = await this.findByIdForUser(id, userId);

    if (!existing) {
      return null;
    }

    const record = await this.db.transaction.update({
      where: { id },
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: data.date,
        categoryId: data.categoryId,
        accountId: data.accountId,
        paymentMethodId: data.paymentMethodId,
        cardId: data.cardId,
        installments: data.installments,
        ...(data.liabilityId !== undefined ? { liabilityId: data.liabilityId } : {}),
        ...(data.metadata !== undefined
          ? { metadata: data.metadata as Prisma.InputJsonValue }
          : {}),
      },
      include: RELATION_SELECT,
    });

    return toTransactionWithRelations(record);
  }

  async deleteById(id: string, userId: string): Promise<Transaction | null> {
    const existing = await this.findByIdForUser(id, userId);

    if (!existing) {
      return null;
    }

    await this.db.transaction.delete({ where: { id } });
    return existing;
  }
}
