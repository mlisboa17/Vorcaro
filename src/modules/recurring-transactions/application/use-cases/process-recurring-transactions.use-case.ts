import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import {
  buildCreditCardAwareTransactions,
  CreditCardTransactionBuilderError,
} from "@/modules/financial/application/services/credit-card-transaction-builder.service";
import { resolveCardBillingConfig } from "@/modules/transactions/application/services/resolve-card-billing.service";
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
  constructor(
    private readonly repository: RecurringTransactionRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
  ) {}

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
        metadata: {
          source: "recurring-transaction",
          frequencia: recurring.frequencia,
        },
        lancamentoRecorrenteId: recurring.id,
        dataRecorrencia: executionDate,
      });

      if (!isCardPaymentMethodType(paymentMethod.type)) {
        transactionInput.dataCaixa = executionDate;
      }

      await this.repository.processOccurrence({
        recurring,
        executionDate,
        transactionInput,
      });

      return "created";
    } catch (error) {
      if (error instanceof RecurringTransactionError) {
        return "failed";
      }

      throw error;
    }
  }
}
