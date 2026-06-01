import {
  isCardPaymentMethodType,
  isCashPaymentMethodType,
} from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import { isCashWalletAccountType } from "@/modules/financial-config/domain/mappers/config-api.mapper";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "@/modules/transactions/domain/ports/ownership-validation.port";

export class TransactionInstrumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionInstrumentValidationError";
  }
}

export interface ValidateTransactionInstrumentsInput {
  userId: string;
  categoryId: string;
  accountId: string;
  paymentMethodId: string;
  cardId?: string | null;
}

export interface ValidatedTransactionInstruments {
  categoryId: string;
  accountId: string;
  paymentMethodId: string;
  cardId: string | null;
}

/**
 * Regra de ouro dos instrumentos financeiros na criação/atualização de transações.
 */
export async function validateTransactionInstruments(
  repositories: {
    categoryRepository: CategoryRepositoryPort;
    financialAccountRepository: FinancialAccountRepositoryPort;
    paymentMethodRepository: PaymentMethodRepositoryPort;
    cardRepository: CardRepositoryPort;
  },
  input: ValidateTransactionInstrumentsInput,
): Promise<ValidatedTransactionInstruments> {
  if (!input.categoryId) {
    throw new TransactionInstrumentValidationError("categoriaId é obrigatório");
  }

  if (!input.accountId) {
    throw new TransactionInstrumentValidationError("contaFinanceiraId é obrigatório");
  }

  if (!input.paymentMethodId) {
    throw new TransactionInstrumentValidationError("formaPagamentoId é obrigatório");
  }

  const categoryValid = await repositories.categoryRepository.belongsToUser(
    input.categoryId,
    input.userId,
  );

  if (!categoryValid) {
    throw new TransactionInstrumentValidationError("Categoria não encontrada ou inválida");
  }

  const account = await repositories.financialAccountRepository.findActiveByIdForUser(
    input.accountId,
    input.userId,
  );

  if (!account) {
    throw new TransactionInstrumentValidationError("Conta financeira não encontrada ou inválida");
  }

  const paymentMethod = await repositories.paymentMethodRepository.findActiveByIdForUser(
    input.paymentMethodId,
    input.userId,
  );

  if (!paymentMethod) {
    throw new TransactionInstrumentValidationError("Forma de pagamento não encontrada ou inválida");
  }

  const isCash = isCashPaymentMethodType(paymentMethod.type);
  const isCard = isCardPaymentMethodType(paymentMethod.type);

  if (isCash && !isCashWalletAccountType(account.type)) {
    throw new TransactionInstrumentValidationError(
      "Pagamentos em dinheiro devem usar uma conta do tipo Carteira Dinheiro",
    );
  }

  const requestedCardId = input.cardId?.trim() || null;
  let cardId: string | null = null;

  if (isCard) {
    if (!requestedCardId) {
      throw new TransactionInstrumentValidationError(
        "cartaoId é obrigatório quando a forma de pagamento é Cartão",
      );
    }

    const cardValid = await repositories.cardRepository.belongsToUser(requestedCardId, input.userId);

    if (!cardValid) {
      throw new TransactionInstrumentValidationError("Cartão não encontrado ou inválido");
    }

    cardId = requestedCardId;
  } else if (requestedCardId) {
    throw new TransactionInstrumentValidationError(
      "cartaoId não deve ser informado quando a forma de pagamento não é Cartão",
    );
  }

  return {
    categoryId: input.categoryId,
    accountId: input.accountId,
    paymentMethodId: input.paymentMethodId,
    cardId,
  };
}
