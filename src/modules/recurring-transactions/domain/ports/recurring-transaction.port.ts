import type {
  FrequenciaRecorrencia,
  TipoLancamentoRecorrente,
} from "@prisma/client";
import type { TransactionInput } from "@/modules/transactions/domain/ports/transaction-repository.port";

export interface RecurringTransactionRecord {
  id: string;
  userId: string;
  descricao: string;
  tipo: TipoLancamentoRecorrente;
  valor: number;
  frequencia: FrequenciaRecorrencia;
  dataInicio: Date;
  dataFim: Date | null;
  proximaExecucao: Date;
  estaAtivo: boolean;
  categoryId: string;
  financialAccountId: string;
  paymentMethodId: string;
  cardId: string | null;
  observacoes: string | null;
  diaInicioOriginal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecurringTransactionInput {
  userId: string;
  descricao: string;
  tipo: TipoLancamentoRecorrente;
  valor: number;
  frequencia: FrequenciaRecorrencia;
  dataInicio: Date;
  dataFim?: Date | null;
  categoryId: string;
  financialAccountId: string;
  paymentMethodId: string;
  cardId?: string | null;
  observacoes?: string | null;
}

export interface UpdateRecurringTransactionInput {
  userId: string;
  id: string;
  descricao?: string;
  tipo?: RecurringTransactionRecord["tipo"];
  valor?: number;
  frequencia?: RecurringTransactionRecord["frequencia"];
  dataInicio?: Date;
  dataFim?: Date | null;
  proximaExecucao?: Date;
  categoryId?: string;
  financialAccountId?: string;
  paymentMethodId?: string;
  cardId?: string | null;
  observacoes?: string | null;
}

export interface ProcessRecurringOccurrenceInput {
  recurring: RecurringTransactionRecord;
  executionDate: Date;
  transactionInput: TransactionInput;
}

export interface RecurringTransactionRepositoryPort {
  listByUserId(
    userId: string,
    options?: { includeInactive?: boolean },
  ): Promise<RecurringTransactionRecord[]>;
  findByIdForUser(id: string, userId: string): Promise<RecurringTransactionRecord | null>;
  create(input: CreateRecurringTransactionInput): Promise<RecurringTransactionRecord>;
  update(input: UpdateRecurringTransactionInput): Promise<RecurringTransactionRecord>;
  findDueActiveByUserId(userId: string, untilDate: Date): Promise<RecurringTransactionRecord[]>;
  hasGeneratedTransaction(
    userId: string,
    lancamentoRecorrenteId: string,
    dataRecorrencia: Date,
  ): Promise<boolean>;
  processOccurrence(input: ProcessRecurringOccurrenceInput): Promise<void>;
  advanceNextExecution(
    id: string,
    currentExecutionDate: Date,
    frequency: RecurringTransactionRecord["frequencia"],
    diaInicioOriginal: number,
  ): Promise<void>;
  deactivate(id: string, userId: string): Promise<void>;
}
