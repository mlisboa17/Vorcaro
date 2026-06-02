import {
  isCardPaymentMethodType,
  isCashPaymentMethodType,
} from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import { isCashWalletAccountType } from "@/modules/financial-config/domain/mappers/config-api.mapper";
import { TransactionInstrumentValidationError } from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";
import type { BulkTransactionUpdates } from "../../domain/schemas/bulk-update-transactions-api.schema";
import { resolveBulkCategoryId } from "../../domain/schemas/bulk-update-transactions-api.schema";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "../../domain/ports/ownership-validation.port";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";

export interface ValidatedBulkTransactionPatch {
  categoryId?: string;
  accountId?: string;
  paymentMethodId?: string;
  cardId?: string | null;
  liabilityId?: string | null;
  date?: Date;
  dataCaixa?: Date;
  dataCompra?: Date;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export async function validateBulkTransactionUpdates(
  repositories: {
    categoryRepository: CategoryRepositoryPort;
    financialAccountRepository: FinancialAccountRepositoryPort;
    paymentMethodRepository: PaymentMethodRepositoryPort;
    cardRepository: CardRepositoryPort;
    liabilityRepository: PatrimonyLiabilityRepositoryPort;
  },
  userId: string,
  updates: BulkTransactionUpdates,
): Promise<ValidatedBulkTransactionPatch> {
  const patch: ValidatedBulkTransactionPatch = {};

  const categoryId = resolveBulkCategoryId(updates);

  if (categoryId) {
    const valid = await repositories.categoryRepository.belongsToUser(categoryId, userId);

    if (!valid) {
      throw new TransactionInstrumentValidationError("Categoria não encontrada ou inválida");
    }

    patch.categoryId = categoryId;
  }

  if (updates.financialAccountId) {
    const account = await repositories.financialAccountRepository.findActiveByIdForUser(
      updates.financialAccountId,
      userId,
    );

    if (!account) {
      throw new TransactionInstrumentValidationError("Conta financeira não encontrada ou inválida");
    }

    patch.accountId = account.id;
  }

  if (updates.paymentMethodId) {
    const paymentMethod = await repositories.paymentMethodRepository.findActiveByIdForUser(
      updates.paymentMethodId,
      userId,
    );

    if (!paymentMethod) {
      throw new TransactionInstrumentValidationError("Forma de pagamento não encontrada ou inválida");
    }

    patch.paymentMethodId = paymentMethod.id;

    const isCard = isCardPaymentMethodType(paymentMethod.type);

    if (isCard) {
      const requestedCardId = updates.cardId?.trim() || null;

      if (!requestedCardId) {
        throw new TransactionInstrumentValidationError(
          "cardId é obrigatório ao alterar a forma de pagamento para Cartão",
        );
      }

      const cardValid = await repositories.cardRepository.belongsToUser(requestedCardId, userId);

      if (!cardValid) {
        throw new TransactionInstrumentValidationError("Cartão não encontrado ou inválido");
      }

      patch.cardId = requestedCardId;
    } else {
      patch.cardId = null;
    }
  } else if (updates.cardId !== undefined) {
    if (updates.cardId === null) {
      patch.cardId = null;
    } else {
      const cardValid = await repositories.cardRepository.belongsToUser(updates.cardId, userId);

      if (!cardValid) {
        throw new TransactionInstrumentValidationError("Cartão não encontrado ou inválido");
      }

      patch.cardId = updates.cardId;
    }
  }

  if (updates.financialAccountId && updates.paymentMethodId) {
    const account = await repositories.financialAccountRepository.findActiveByIdForUser(
      updates.financialAccountId,
      userId,
    );
    const paymentMethod = await repositories.paymentMethodRepository.findActiveByIdForUser(
      updates.paymentMethodId,
      userId,
    );

    if (
      account &&
      paymentMethod &&
      isCashPaymentMethodType(paymentMethod.type) &&
      !isCashWalletAccountType(account.type)
    ) {
      throw new TransactionInstrumentValidationError(
        "Pagamentos em dinheiro devem usar uma conta do tipo Carteira Dinheiro",
      );
    }
  }

  if (updates.liabilityId !== undefined) {
    if (updates.liabilityId === null) {
      patch.liabilityId = null;
    } else {
      const liability = await repositories.liabilityRepository.findByIdForUser(
        updates.liabilityId,
        userId,
      );

      if (!liability) {
        throw new TransactionInstrumentValidationError("Passivo vinculado não encontrado");
      }

      patch.liabilityId = liability.id;
    }
  }

  if (updates.date) {
    patch.date = parseDateOnly(updates.date);
  }

  if (updates.dataCaixa) {
    patch.dataCaixa = parseDateOnly(updates.dataCaixa);
  }

  if (updates.dataCompra) {
    patch.dataCompra = parseDateOnly(updates.dataCompra);
  }

  return patch;
}
