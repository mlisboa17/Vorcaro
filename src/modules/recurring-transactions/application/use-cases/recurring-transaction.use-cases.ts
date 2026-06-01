import {
  TransactionInstrumentValidationError,
  validateTransactionInstruments,
} from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "@/modules/transactions/domain/ports/ownership-validation.port";
import { RecurringTransactionError } from "../../domain/errors/recurring-transaction.error";
import type {
  CreateRecurringTransactionInput,
  RecurringTransactionRepositoryPort,
  UpdateRecurringTransactionInput,
} from "../../domain/ports/recurring-transaction.port";

export class CreateRecurringTransactionUseCase {
  constructor(
    private readonly repository: RecurringTransactionRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
  ) {}

  async execute(input: CreateRecurringTransactionInput) {
    if (input.valor <= 0) {
      throw new RecurringTransactionError("valor deve ser maior que zero");
    }

    if (input.dataFim && input.dataFim.getTime() < input.dataInicio.getTime()) {
      throw new RecurringTransactionError("dataFim não pode ser anterior a dataInicio");
    }

    let validatedCardId: string | null = null;

    try {
      const validated = await validateTransactionInstruments(
        {
          categoryRepository: this.categoryRepository,
          financialAccountRepository: this.financialAccountRepository,
          paymentMethodRepository: this.paymentMethodRepository,
          cardRepository: this.cardRepository,
        },
        {
          userId: input.userId,
          categoryId: input.categoryId,
          accountId: input.financialAccountId,
          paymentMethodId: input.paymentMethodId,
          cardId: input.cardId,
        },
      );

      validatedCardId = validated.cardId;
    } catch (error) {
      if (error instanceof TransactionInstrumentValidationError) {
        throw new RecurringTransactionError(error.message);
      }

      throw error;
    }

    return this.repository.create({
      ...input,
      cardId: validatedCardId,
    });
  }
}

export class ListRecurringTransactionsUseCase {
  constructor(private readonly repository: RecurringTransactionRepositoryPort) {}

  execute(userId: string, options?: { includeInactive?: boolean }) {
    return this.repository.listByUserId(userId, options);
  }
}

export interface UpdateRecurringTransactionCommand {
  userId: string;
  id: string;
  descricao?: string;
  tipo?: CreateRecurringTransactionInput["tipo"];
  valor?: number;
  frequencia?: CreateRecurringTransactionInput["frequencia"];
  dataInicio?: Date;
  dataFim?: Date | null;
  proximaExecucao?: Date;
  categoryId?: string;
  financialAccountId?: string;
  paymentMethodId?: string;
  cardId?: string | null;
  observacoes?: string | null;
}

export class UpdateRecurringTransactionUseCase {
  constructor(
    private readonly repository: RecurringTransactionRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
  ) {}

  async execute(input: UpdateRecurringTransactionCommand) {
    const existing = await this.repository.findByIdForUser(input.id, input.userId);

    if (!existing) {
      throw new RecurringTransactionError("Lançamento recorrente não encontrado", "NOT_FOUND");
    }

    if (input.valor !== undefined && input.valor <= 0) {
      throw new RecurringTransactionError("valor deve ser maior que zero");
    }

    const dataInicio = input.dataInicio ?? existing.dataInicio;
    const dataFim = input.dataFim === undefined ? existing.dataFim : input.dataFim;

    if (dataFim && dataFim.getTime() < dataInicio.getTime()) {
      throw new RecurringTransactionError("dataFim não pode ser anterior a dataInicio");
    }

    const categoryId = input.categoryId ?? existing.categoryId;
    const financialAccountId = input.financialAccountId ?? existing.financialAccountId;
    const paymentMethodId = input.paymentMethodId ?? existing.paymentMethodId;
    const cardId = input.cardId === undefined ? existing.cardId : input.cardId;

    let validatedCardId: string | null = cardId;

    try {
      const validated = await validateTransactionInstruments(
        {
          categoryRepository: this.categoryRepository,
          financialAccountRepository: this.financialAccountRepository,
          paymentMethodRepository: this.paymentMethodRepository,
          cardRepository: this.cardRepository,
        },
        {
          userId: input.userId,
          categoryId,
          accountId: financialAccountId,
          paymentMethodId,
          cardId,
        },
      );

      validatedCardId = validated.cardId;
    } catch (error) {
      if (error instanceof TransactionInstrumentValidationError) {
        throw new RecurringTransactionError(error.message);
      }

      throw error;
    }

    return this.repository.update({
      userId: input.userId,
      id: input.id,
      descricao: input.descricao,
      tipo: input.tipo,
      valor: input.valor,
      frequencia: input.frequencia,
      dataInicio: input.dataInicio,
      dataFim: input.dataFim,
      proximaExecucao: input.proximaExecucao,
      categoryId: input.categoryId,
      financialAccountId: input.financialAccountId,
      paymentMethodId: input.paymentMethodId,
      cardId: validatedCardId,
      observacoes: input.observacoes,
    });
  }
}

export class DeactivateRecurringTransactionUseCase {
  constructor(private readonly repository: RecurringTransactionRepositoryPort) {}

  async execute(userId: string, id: string) {
    const existing = await this.repository.findByIdForUser(id, userId);

    if (!existing) {
      throw new RecurringTransactionError("Lançamento recorrente não encontrado", "NOT_FOUND");
    }

    await this.repository.deactivate(id, userId);
  }
}

export { ProcessRecurringTransactionsUseCase } from "./process-recurring-transactions.use-case";
export type { ProcessRecurringTransactionsOutput } from "./process-recurring-transactions.use-case";
