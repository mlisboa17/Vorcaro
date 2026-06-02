import { buildLiabilityPaymentMetadata } from "@/lib/financial/liability-payment-metadata";
import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import {
  buildCreditCardAwareTransactions,
  CreditCardTransactionBuilderError,
} from "@/modules/financial/application/services/credit-card-transaction-builder.service";
import { LiabilityAmortizationService } from "@/modules/patrimony/application/services/liability-amortization.service";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";
import { resolveCardBillingConfig } from "@/modules/transactions/application/services/resolve-card-billing.service";
import type { TransactionRepositoryPort } from "@/modules/transactions/domain/ports/transaction-repository.port";
import type {
  CardRepositoryPort,
  PaymentMethodRepositoryPort,
} from "@/modules/transactions/domain/ports/ownership-validation.port";
import { RecurringTransactionError } from "../../domain/errors/recurring-transaction.error";
import type {
  RecurringTransactionRecord,
  RecurringTransactionRepositoryPort,
} from "../../domain/ports/recurring-transaction.port";
import {
  isRecurringExpired,
  parseDateOnlyToUtcNoon,
} from "../../domain/services/calculate-next-recurring-date";

export interface ProcessRecurringTransactionsOutput {
  created: number;
  skipped: number;
  failed: number;
}

export type ProcessRecurringItemResult = "created" | "skipped" | "failed";

export class ProcessRecurringTransactionsUseCase {
  private readonly amortization: LiabilityAmortizationService;

  constructor(
    private readonly repository: RecurringTransactionRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
    private readonly transactionRepository: TransactionRepositoryPort,
    liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {
    this.amortization = new LiabilityAmortizationService(liabilityRepository);
  }

  async execute(userId: string, referenceDate = new Date()): Promise<ProcessRecurringTransactionsOutput> {
    const dueItems = await this.repository.findDueActiveByUserId(userId, referenceDate);
    const totals: ProcessRecurringTransactionsOutput = {
      created: 0,
      skipped: 0,
      failed: 0,
    };

    for (const recurring of dueItems) {
      totals[await this.processOne(recurring)] += 1;
    }

    return totals;
  }

  async processOne(recurring: RecurringTransactionRecord): Promise<ProcessRecurringItemResult> {
    try {
      const executionDate = parseDateOnlyToUtcNoon(
        recurring.proximaExecucao.toISOString().slice(0, 10),
      );

      if (isRecurringExpired(executionDate, recurring.dataFim)) {
        await this.repository.deactivate(recurring.id, recurring.userId);
        return "skipped";
      }

      const alreadyGenerated = await this.repository.hasGeneratedTransaction(
        recurring.userId,
        recurring.id,
        executionDate,
      );

      if (alreadyGenerated) {
        await this.repository.advanceNextExecution(
          recurring.id,
          executionDate,
          recurring.frequencia,
          recurring.diaInicioOriginal,
        );
        return "skipped";
      }

      const paymentMethod = await this.paymentMethodRepository.findActiveByIdForUser(
        recurring.paymentMethodId,
        recurring.userId,
      );

      if (!paymentMethod) {
        return "failed";
      }

      let cardBilling = null;

      try {
        cardBilling = await resolveCardBillingConfig(
          this.cardRepository,
          this.paymentMethodRepository,
          {
            userId: recurring.userId,
            cardId: recurring.cardId,
            paymentMethodId: recurring.paymentMethodId,
          },
        );
      } catch (error) {
        if (error instanceof CreditCardTransactionBuilderError) {
          return "failed";
        }

        throw error;
      }

      const liabilityMetadata = recurring.liabilityId
        ? buildLiabilityPaymentMetadata(recurring.defaultAllocations ?? undefined)
        : null;

      const metadata = recurring.liabilityId
        ? {
            source: "recurring-transaction",
            frequencia: recurring.frequencia,
            ...liabilityMetadata,
          }
        : {
            source: "recurring-transaction",
            frequencia: recurring.frequencia,
          };

      const [transactionInput] = buildCreditCardAwareTransactions({
        userId: recurring.userId,
        description: recurring.descricao,
        totalAmount: recurring.valor,
        type: recurring.tipo === "RECEITA" ? "INCOME" : "EXPENSE",
        purchaseDate: executionDate,
        categoryId: recurring.categoryId,
        accountId: recurring.financialAccountId,
        paymentMethodId: recurring.paymentMethodId,
        paymentMethodType: paymentMethod.type,
        cardId: recurring.cardId ?? undefined,
        cardBilling,
        installments: 1,
        notes: recurring.observacoes ?? undefined,
        metadata,
        lancamentoRecorrenteId: recurring.id,
        dataRecorrencia: executionDate,
        liabilityId: recurring.liabilityId ?? undefined,
      });

      if (!isCardPaymentMethodType(paymentMethod.type)) {
        transactionInput.dataCaixa = executionDate;
      }

      const { transactionId } = await this.repository.processOccurrence({
        recurring,
        executionDate,
        transactionInput,
      });

      if (recurring.liabilityId && liabilityMetadata) {
        try {
          const stamped = await this.amortization.applyAmortization({
            liabilityId: recurring.liabilityId,
            userId: recurring.userId,
            metadata: metadata as Record<string, unknown>,
            allocations: recurring.defaultAllocations ?? undefined,
          });

          const existing = await this.transactionRepository.findByIdForUser(
            transactionId,
            recurring.userId,
          );

          if (existing) {
            await this.transactionRepository.updateById(transactionId, recurring.userId, {
              description: existing.description,
              amount: existing.amount,
              type: existing.type,
              date: existing.date,
              categoryId: existing.categoryId,
              accountId: existing.accountId,
              paymentMethodId: existing.paymentMethodId ?? "",
              cardId: existing.cardId,
              installments: existing.installments,
              liabilityId: recurring.liabilityId,
              metadata: stamped,
            });
          }
        } catch (error) {
          if (error instanceof PatrimonyError) {
            return "failed";
          }

          throw error;
        }
      }

      return "created";
    } catch (error) {
      if (error instanceof RecurringTransactionError) {
        return "failed";
      }

      throw error;
    }
  }
}
