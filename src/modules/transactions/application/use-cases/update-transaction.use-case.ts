import type { TransactionType } from "@prisma/client";
import {
  TransactionInstrumentValidationError,
  validateTransactionInstruments,
} from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "../../domain/ports/ownership-validation.port";
import type {
  TransactionRepositoryPort,
  TransactionWithRelations,
} from "../../domain/ports/transaction-repository.port";
import { UpdateTransactionError } from "../errors/update-transaction.error";

export interface UpdateTransactionCommand {
  transactionId: string;
  userId: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  data: string;
  categoriaId: string;
  contaFinanceiraId: string;
  metodoPagamentoId: string;
  cartaoId?: string | null;
  parcelas: number;
}

export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
  ) {}

  async execute(input: UpdateTransactionCommand): Promise<TransactionWithRelations> {
    const existing = await this.transactionRepository.findByIdForUser(
      input.transactionId,
      input.userId,
    );

    if (!existing) {
      throw new UpdateTransactionError("Transação não encontrada", "NOT_FOUND");
    }

    if (!input.descricao.trim()) {
      throw new UpdateTransactionError("A descrição é obrigatória", "VALIDATION");
    }

    if (input.valor <= 0) {
      throw new UpdateTransactionError("O valor deve ser maior que zero", "VALIDATION");
    }

    if (!input.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new UpdateTransactionError("A data deve estar no formato YYYY-MM-DD", "VALIDATION");
    }

    if (input.parcelas < 1) {
      throw new UpdateTransactionError("O número de parcelas deve ser pelo menos 1", "VALIDATION");
    }

    let instruments;

    try {
      instruments = await validateTransactionInstruments(
        {
          categoryRepository: this.categoryRepository,
          financialAccountRepository: this.financialAccountRepository,
          paymentMethodRepository: this.paymentMethodRepository,
          cardRepository: this.cardRepository,
        },
        {
          userId: input.userId,
          categoryId: input.categoriaId,
          accountId: input.contaFinanceiraId,
          paymentMethodId: input.metodoPagamentoId,
          cardId: input.cartaoId,
        },
      );
    } catch (error) {
      if (error instanceof TransactionInstrumentValidationError) {
        throw new UpdateTransactionError(error.message, "VALIDATION");
      }
      throw error;
    }

    const date = this.parseDate(input.data);

    const updated = await this.transactionRepository.updateById(input.transactionId, input.userId, {
      description: input.descricao.trim(),
      amount: input.valor,
      type: input.tipo,
      date,
      categoryId: instruments.categoryId,
      accountId: instruments.accountId,
      paymentMethodId: instruments.paymentMethodId,
      cardId: instruments.cardId,
      installments: input.parcelas,
    });

    if (!updated) {
      throw new UpdateTransactionError("Transação não encontrada", "NOT_FOUND");
    }

    return updated;
  }

  private parseDate(value: string): Date {
    const parsed = new Date(`${value}T12:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new UpdateTransactionError("Data inválida", "VALIDATION");
    }

    return parsed;
  }
}
