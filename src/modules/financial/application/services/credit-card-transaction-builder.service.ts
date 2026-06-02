import { randomUUID } from "node:crypto";
import type { PaymentMethodType, TransactionType } from "@prisma/client";
import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import type { TransactionInput } from "@/modules/transactions/domain/ports/transaction-repository.port";
import {
  addMonthsPreserveDay,
  calculateCreditCardCashDate,
} from "../../core/calculate-credit-card-cash-date";

export interface CardBillingConfig {
  closingDay: number;
  dueDay: number;
}

export interface BuildCreditCardTransactionsInput {
  userId: string;
  description: string;
  totalAmount: number;
  type: TransactionType;
  purchaseDate: Date;
  categoryId?: string;
  accountId?: string;
  paymentMethodId?: string;
  paymentMethodType: PaymentMethodType;
  cardId?: string;
  cardBilling?: CardBillingConfig | null;
  installments?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  lancamentoRecorrenteId?: string;
  dataRecorrencia?: Date;
  liabilityId?: string;
}

export class CreditCardTransactionBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreditCardTransactionBuilderError";
  }
}

function splitInstallmentAmounts(total: number, count: number): number[] {
  const base = Math.floor((total / count) * 100) / 100;
  const amounts = Array.from({ length: count }, () => base);
  const allocated = base * count;
  amounts[count - 1] = Math.round((amounts[count - 1] + (total - allocated)) * 100) / 100;
  return amounts;
}

function applyCreditCardDates(
  input: Omit<BuildCreditCardTransactionsInput, "installments">,
  purchaseDate: Date,
  partial: Pick<
    TransactionInput,
    "amount" | "numeroParcela" | "totalParcelas" | "idGrupoParcelamento"
  >,
): TransactionInput {
  const billing = input.cardBilling;

  if (!billing || !isCardPaymentMethodType(input.paymentMethodType)) {
    return {
      userId: input.userId,
      description: input.description,
      amount: partial.amount,
      type: input.type,
      date: purchaseDate,
      dataCompra: purchaseDate,
      categoryId: input.categoryId,
      accountId: input.accountId,
      paymentMethodId: input.paymentMethodId,
      cardId: input.cardId,
      notes: input.notes,
      metadata: input.metadata,
      installments: partial.totalParcelas ?? 1,
      installmentGroup: partial.idGrupoParcelamento,
      currentInstallment: partial.numeroParcela,
      totalInstallments: partial.totalParcelas,
      numeroParcela: partial.numeroParcela,
      totalParcelas: partial.totalParcelas,
      idGrupoParcelamento: partial.idGrupoParcelamento,
      lancamentoRecorrenteId: input.lancamentoRecorrenteId,
      dataRecorrencia: input.dataRecorrencia,
      liabilityId: input.liabilityId,
    };
  }

  const { dataCaixa, dataVencimentoFatura } = calculateCreditCardCashDate(
    purchaseDate,
    billing.closingDay,
    billing.dueDay,
  );

  return {
    userId: input.userId,
    description: input.description,
    amount: partial.amount,
    type: input.type,
    date: purchaseDate,
    dataCompra: purchaseDate,
    dataCaixa,
    dataVencimentoFatura,
    categoryId: input.categoryId,
    accountId: input.accountId,
    paymentMethodId: input.paymentMethodId,
    cardId: input.cardId,
    notes: input.notes,
    metadata: input.metadata,
    installments: partial.totalParcelas ?? 1,
    installmentGroup: partial.idGrupoParcelamento,
    currentInstallment: partial.numeroParcela,
    totalInstallments: partial.totalParcelas,
    numeroParcela: partial.numeroParcela,
    totalParcelas: partial.totalParcelas,
    idGrupoParcelamento: partial.idGrupoParcelamento,
    lancamentoRecorrenteId: input.lancamentoRecorrenteId,
    dataRecorrencia: input.dataRecorrencia,
    liabilityId: input.liabilityId,
  };
}

export function buildCreditCardAwareTransactions(
  input: BuildCreditCardTransactionsInput,
): TransactionInput[] {
  const installments = Math.max(1, input.installments ?? 1);
  const useInstallments =
    installments > 1 && isCardPaymentMethodType(input.paymentMethodType) && input.cardBilling;

  if (installments > 1 && isCardPaymentMethodType(input.paymentMethodType) && !input.cardBilling) {
    throw new CreditCardTransactionBuilderError(
      "Cartão de crédito precisa de dia de fechamento e vencimento para parcelamento.",
    );
  }

  if (!useInstallments) {
    return [
      applyCreditCardDates(input, input.purchaseDate, {
        amount: input.totalAmount,
      }),
    ];
  }

  const groupId = randomUUID();
  const installmentAmounts = splitInstallmentAmounts(input.totalAmount, installments);
  const transactions: TransactionInput[] = [];

  for (let index = 0; index < installments; index += 1) {
    const installmentNumber = index + 1;
    const purchaseDate = addMonthsPreserveDay(input.purchaseDate, index);

    transactions.push(
      applyCreditCardDates(input, purchaseDate, {
        amount: installmentAmounts[index],
        numeroParcela: installmentNumber,
        totalParcelas: installments,
        idGrupoParcelamento: groupId,
      }),
    );
  }

  return transactions.map((transaction, index) => ({
    ...transaction,
    description:
      installments > 1
        ? `${input.description.trim()} (${transaction.numeroParcela}/${transaction.totalParcelas})`
        : input.description.trim(),
    ...(index > 0 ? { metadata: input.metadata } : {}),
  }));
}

export type { TransactionInput };
