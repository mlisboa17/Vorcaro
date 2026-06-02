import type { TransactionType } from "@prisma/client";
import {
  buildLiabilityPaymentMetadata,
  clearLiabilityPaymentMetadata,
  mergeLiabilityPaymentMetadata,
  parseAllocationsInput,
  type TransactionAllocation,
} from "@/lib/financial/liability-payment-metadata";
import {
  TransactionInstrumentValidationError,
  validateTransactionInstruments,
} from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";
import { LiabilityAmortizationService } from "@/modules/patrimony/application/services/liability-amortization.service";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";
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
  liabilityId?: string | null;
  allocations?: TransactionAllocation[];
}

export class UpdateTransactionUseCase {
  private readonly amortization: LiabilityAmortizationService;

  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
    private readonly liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {
    this.amortization = new LiabilityAmortizationService(liabilityRepository);
  }

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

    const nextLiabilityId =
      input.liabilityId === undefined ? existing.liabilityId : input.liabilityId;

    if (nextLiabilityId) {
      const liability = await this.liabilityRepository.findByIdForUser(
        nextLiabilityId,
        input.userId,
      );

      if (!liability) {
        throw new UpdateTransactionError("Passivo vinculado não encontrado", "VALIDATION");
      }
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

    const baseMetadata =
      typeof existing.metadata === "object" && existing.metadata !== null
        ? { ...existing.metadata }
        : {};

    let nextMetadata: Record<string, unknown>;

    if (nextLiabilityId) {
      const allocations =
        input.allocations ?? parseAllocationsInput(baseMetadata.allocations) ?? undefined;

      nextMetadata = mergeLiabilityPaymentMetadata(
        clearLiabilityPaymentMetadata(baseMetadata),
        allocations,
      );
    } else {
      nextMetadata = clearLiabilityPaymentMetadata(baseMetadata);
    }

    try {
      nextMetadata = await this.amortization.syncTransactionAmortization({
        userId: input.userId,
        previousLiabilityId: existing.liabilityId,
        previousMetadata: existing.metadata,
        nextLiabilityId,
        nextMetadata,
        allocations: input.allocations,
      });
    } catch (error) {
      if (error instanceof PatrimonyError) {
        throw new UpdateTransactionError(error.message, "VALIDATION");
      }
      throw error;
    }

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
      liabilityId: nextLiabilityId,
      metadata: nextMetadata,
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
