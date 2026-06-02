import { Prisma, type PrismaClient } from "@prisma/client";
import { parseAllocationsInput } from "@/lib/financial/liability-payment-metadata";
import { toDefaultAllocationsJson } from "@/lib/recurring/to-default-allocations-json";
import {
  calculateNextRecurringDate,
  endOfUtcDay,
  extractOriginalStartDay,
  startOfUtcDay,
} from "../../domain/services/calculate-next-recurring-date";
import type {
  CreateRecurringTransactionInput,
  ProcessRecurringOccurrenceInput,
  RecurringTransactionRecord,
  RecurringTransactionRepositoryPort,
  UpdateRecurringTransactionInput,
} from "../../domain/ports/recurring-transaction.port";

function toRecord(record: {
  id: string;
  userId: string;
  descricao: string;
  tipo: RecurringTransactionRecord["tipo"];
  valor: Prisma.Decimal;
  frequencia: RecurringTransactionRecord["frequencia"];
  dataInicio: Date;
  dataFim: Date | null;
  proximaExecucao: Date;
  estaAtivo: boolean;
  categoryId: string;
  financialAccountId: string;
  paymentMethodId: string;
  cardId: string | null;
  liabilityId: string | null;
  defaultAllocations: Prisma.JsonValue | null;
  observacoes: string | null;
  diaInicioOriginal: number;
  createdAt: Date;
  updatedAt: Date;
}): RecurringTransactionRecord {
  return {
    ...record,
    valor: record.valor.toNumber(),
    defaultAllocations: parseAllocationsInput(record.defaultAllocations) ?? null,
  };
}

export class PrismaRecurringTransactionRepository implements RecurringTransactionRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async listByUserId(
    userId: string,
    options?: { includeInactive?: boolean },
  ): Promise<RecurringTransactionRecord[]> {
    const records = await this.db.lancamentoRecorrente.findMany({
      where: {
        userId,
        ...(options?.includeInactive ? {} : { estaAtivo: true }),
      },
      orderBy: [{ estaAtivo: "desc" }, { proximaExecucao: "asc" }, { descricao: "asc" }],
    });

    return records.map(toRecord);
  }

  async findByIdForUser(id: string, userId: string): Promise<RecurringTransactionRecord | null> {
    const record = await this.db.lancamentoRecorrente.findFirst({
      where: { id, userId },
    });

    return record ? toRecord(record) : null;
  }

  async create(input: CreateRecurringTransactionInput): Promise<RecurringTransactionRecord> {
    const diaInicioOriginal = extractOriginalStartDay(input.dataInicio);

    const record = await this.db.lancamentoRecorrente.create({
      data: {
        userId: input.userId,
        descricao: input.descricao,
        tipo: input.tipo,
        valor: input.valor,
        frequencia: input.frequencia,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim ?? null,
        proximaExecucao: input.dataInicio,
        estaAtivo: true,
        categoryId: input.categoryId,
        financialAccountId: input.financialAccountId,
        paymentMethodId: input.paymentMethodId,
        cardId: input.cardId ?? null,
        liabilityId: input.liabilityId ?? null,
        defaultAllocations: toDefaultAllocationsJson(input.defaultAllocations),
        observacoes: input.observacoes ?? null,
        diaInicioOriginal,
      },
    });

    return toRecord(record);
  }

  async update(input: UpdateRecurringTransactionInput): Promise<RecurringTransactionRecord> {
    const existing = await this.findByIdForUser(input.id, input.userId);

    if (!existing) {
      throw new Error("Lançamento recorrente não encontrado");
    }

    const dataInicio = input.dataInicio ?? existing.dataInicio;
    const diaInicioOriginal = input.dataInicio
      ? extractOriginalStartDay(input.dataInicio)
      : existing.diaInicioOriginal;

    const data: Prisma.LancamentoRecorrenteUpdateInput = {
      ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.valor !== undefined ? { valor: input.valor } : {}),
      ...(input.frequencia !== undefined ? { frequencia: input.frequencia } : {}),
      ...(input.dataInicio !== undefined ? { dataInicio: input.dataInicio } : {}),
      ...(input.dataFim !== undefined ? { dataFim: input.dataFim } : {}),
      ...(input.proximaExecucao !== undefined ? { proximaExecucao: input.proximaExecucao } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.financialAccountId !== undefined
        ? { financialAccountId: input.financialAccountId }
        : {}),
      ...(input.paymentMethodId !== undefined ? { paymentMethodId: input.paymentMethodId } : {}),
      ...(input.cardId !== undefined ? { cardId: input.cardId } : {}),
      ...(input.liabilityId !== undefined ? { liabilityId: input.liabilityId } : {}),
      ...(input.defaultAllocations !== undefined
        ? { defaultAllocations: toDefaultAllocationsJson(input.defaultAllocations) }
        : {}),
      ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
      diaInicioOriginal,
      ...(input.dataInicio !== undefined && !input.proximaExecucao
        ? { proximaExecucao: dataInicio }
        : {}),
    };

    const record = await this.db.lancamentoRecorrente.update({
      where: { id: input.id },
      data,
    });

    return toRecord(record);
  }

  async findDueActiveByUserId(
    userId: string,
    untilDate: Date,
  ): Promise<RecurringTransactionRecord[]> {
    const records = await this.db.lancamentoRecorrente.findMany({
      where: {
        userId,
        estaAtivo: true,
        proximaExecucao: { lte: endOfUtcDay(untilDate) },
      },
      orderBy: [{ proximaExecucao: "asc" }, { createdAt: "asc" }],
    });

    return records.map(toRecord);
  }

  async hasGeneratedTransaction(
    userId: string,
    lancamentoRecorrenteId: string,
    dataRecorrencia: Date,
  ): Promise<boolean> {
    const dayStart = startOfUtcDay(dataRecorrencia);
    const dayEnd = endOfUtcDay(dataRecorrencia);

    const existing = await this.db.transaction.findFirst({
      where: {
        userId,
        lancamentoRecorrenteId,
        dataRecorrencia: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { id: true },
    });

    return existing !== null;
  }

  async processOccurrence(
    input: ProcessRecurringOccurrenceInput,
  ): Promise<{ transactionId: string }> {
    const { recurring, executionDate, transactionInput } = input;
    const nextExecution = calculateNextRecurringDate(
      executionDate,
      recurring.frequencia,
      recurring.diaInicioOriginal,
    );

    const [created] = await this.db.$transaction([
      this.db.transaction.create({
        data: {
          userId: transactionInput.userId,
          accountId: transactionInput.accountId,
          categoryId: transactionInput.categoryId,
          paymentMethodId: transactionInput.paymentMethodId,
          cardId: transactionInput.cardId,
          type: transactionInput.type,
          amount: transactionInput.amount,
          description: transactionInput.description,
          date: transactionInput.date,
          dataCompra: transactionInput.dataCompra,
          dataCaixa: transactionInput.dataCaixa,
          dataVencimentoFatura: transactionInput.dataVencimentoFatura,
          lancamentoRecorrenteId: recurring.id,
          dataRecorrencia: executionDate,
          notes: transactionInput.notes,
          metadata: transactionInput.metadata as Prisma.InputJsonValue | undefined,
          numeroParcela: transactionInput.numeroParcela,
          totalParcelas: transactionInput.totalParcelas,
          idGrupoParcelamento: transactionInput.idGrupoParcelamento,
          installmentGroup: transactionInput.installmentGroup ?? transactionInput.idGrupoParcelamento,
          currentInstallment: transactionInput.currentInstallment ?? transactionInput.numeroParcela,
          totalInstallments: transactionInput.totalInstallments ?? transactionInput.totalParcelas,
          installments: transactionInput.installments ?? 1,
          liabilityId: transactionInput.liabilityId,
        },
      }),
      this.db.lancamentoRecorrente.update({
        where: { id: recurring.id },
        data: { proximaExecucao: nextExecution },
      }),
    ]);

    return { transactionId: created.id };
  }

  async advanceNextExecution(
    id: string,
    currentExecutionDate: Date,
    frequency: RecurringTransactionRecord["frequencia"],
    diaInicioOriginal: number,
  ): Promise<void> {
    const nextExecution = calculateNextRecurringDate(
      currentExecutionDate,
      frequency,
      diaInicioOriginal,
    );

    await this.db.lancamentoRecorrente.update({
      where: { id },
      data: { proximaExecucao: nextExecution },
    });
  }

  async deactivate(id: string, userId: string): Promise<void> {
    await this.db.lancamentoRecorrente.updateMany({
      where: { id, userId },
      data: { estaAtivo: false },
    });
  }
}
