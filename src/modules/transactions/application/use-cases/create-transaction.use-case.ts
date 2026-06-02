import type { TransactionType } from "@prisma/client";
import {
  buildLiabilityPaymentMetadata,
  parseAllocationsInput,
  type TransactionAllocation,
} from "@/lib/financial/liability-payment-metadata";
import {
  TransactionInstrumentValidationError,
  validateTransactionInstruments,
} from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";
import {
  buildCreditCardAwareTransactions,
  CreditCardTransactionBuilderError,
} from "@/modules/financial/application/services/credit-card-transaction-builder.service";
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
import { CreateTransactionError } from "../errors/create-transaction.error";
import { resolveCardBillingConfig } from "../services/resolve-card-billing.service";

export interface CreateTransactionCommand {
  userId: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  data: string;
  categoriaId: string;
  contaFinanceiraId: string;
  formaPagamentoId: string;
  cartaoId?: string | null;
  parcelas?: number;
  liabilityId?: string;
  allocations?: TransactionAllocation[];
}

export class CreateTransactionUseCase {
  private readonly amortization: LiabilityAmortizationService;

  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
    private readonly liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {
    this.amortization = new LiabilityAmortizationService(liabilityRepository);
  }

  async execute(input: CreateTransactionCommand): Promise<TransactionWithRelations> {
    const parcelas = input.parcelas ?? 1;

    if (parcelas < 1) {
      throw new CreateTransactionError("parcelas deve ser pelo menos 1", "VALIDATION");
    }

    if (input.liabilityId) {
      const liability = await this.liabilityRepository.findByIdForUser(
        input.liabilityId,
        input.userId,
      );

      if (!liability) {
        throw new CreateTransactionError("Passivo vinculado não encontrado", "VALIDATION");
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
          paymentMethodId: input.formaPagamentoId,
          cardId: input.cartaoId,
        },
      );
    } catch (error) {
      if (error instanceof TransactionInstrumentValidationError) {
        throw new CreateTransactionError(error.message, "VALIDATION");
      }

      throw error;
    }

    const paymentMethod = await this.paymentMethodRepository.findActiveByIdForUser(
      input.formaPagamentoId,
      input.userId,
    );

    if (!paymentMethod) {
      throw new CreateTransactionError("Forma de pagamento inválida", "VALIDATION");
    }

    const purchaseDate = this.parseDate(input.data);

    let cardBilling = null;

    try {
      cardBilling = await resolveCardBillingConfig(
        this.cardRepository,
        this.paymentMethodRepository,
        {
          userId: input.userId,
          cardId: instruments.cardId,
          paymentMethodId: instruments.paymentMethodId,
        },
      );
    } catch (error) {
      if (error instanceof CreditCardTransactionBuilderError) {
        throw new CreateTransactionError(error.message, "VALIDATION");
      }

      throw error;
    }

    const baseMetadata: Record<string, unknown> = { source: "manual-api" };

    const metadata: Record<string, unknown> = input.liabilityId
      ? { ...baseMetadata, ...buildLiabilityPaymentMetadata(input.allocations) }
      : baseMetadata;

    let transactionInputs;

    try {
      transactionInputs = buildCreditCardAwareTransactions({
        userId: input.userId,
        description: input.descricao.trim(),
        totalAmount: input.valor,
        type: input.tipo,
        purchaseDate,
        categoryId: instruments.categoryId,
        accountId: instruments.accountId,
        paymentMethodId: instruments.paymentMethodId,
        paymentMethodType: paymentMethod.type,
        cardId: instruments.cardId ?? undefined,
        cardBilling,
        installments: parcelas,
        metadata,
        liabilityId: input.liabilityId,
      });
    } catch (error) {
      if (error instanceof CreditCardTransactionBuilderError) {
        throw new CreateTransactionError(error.message, "VALIDATION");
      }

      throw error;
    }

    const created =
      transactionInputs.length === 1
        ? [await this.transactionRepository.save(transactionInputs[0])]
        : await this.transactionRepository.saveMany(transactionInputs);

    if (input.liabilityId) {
      try {
        const stamped = await this.amortization.applyAmortization({
          liabilityId: input.liabilityId,
          userId: input.userId,
          metadata: metadata as Record<string, unknown>,
          allocations: input.allocations,
        });

        await this.transactionRepository.updateById(created[0].id, input.userId, {
          description: created[0].description,
          amount: created[0].amount,
          type: created[0].type,
          date: created[0].date,
          categoryId: created[0].categoryId,
          accountId: created[0].accountId,
          paymentMethodId: created[0].paymentMethodId ?? "",
          cardId: created[0].cardId,
          installments: created[0].installments,
          liabilityId: input.liabilityId,
          metadata: stamped,
        });
      } catch (error) {
        if (error instanceof PatrimonyError) {
          throw new CreateTransactionError(error.message, "VALIDATION");
        }

        throw error;
      }
    }

    const withRelations = await this.transactionRepository.findByIdWithRelationsForUser(
      created[0].id,
      input.userId,
    );

    if (!withRelations) {
      throw new CreateTransactionError("Falha ao carregar transação criada", "VALIDATION");
    }

    return withRelations;
  }

  private parseDate(value: string): Date {
    const parsed = new Date(`${value}T12:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new CreateTransactionError("data inválida", "VALIDATION");
    }

    return parsed;
  }
}

export { parseAllocationsInput };
