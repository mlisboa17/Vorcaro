import type { PaymentMethodType } from "@prisma/client";
import type {
  CardRepositoryPort,
  PaymentMethodRepositoryPort,
} from "../../domain/ports/ownership-validation.port";
import type { CardBillingConfig } from "@/modules/financial/application/services/credit-card-transaction-builder.service";
import { CreditCardTransactionBuilderError } from "@/modules/financial/application/services/credit-card-transaction-builder.service";

export async function resolveCardBillingConfig(
  cardRepository: CardRepositoryPort,
  paymentMethodRepository: PaymentMethodRepositoryPort,
  input: {
    userId: string;
    cardId?: string | null;
    paymentMethodId: string;
  },
): Promise<CardBillingConfig | null> {
  const paymentMethod = await paymentMethodRepository.findActiveByIdForUser(
    input.paymentMethodId,
    input.userId,
  );

  if (!paymentMethod || !input.cardId) {
    return null;
  }

  const creditTypes: PaymentMethodType[] = ["CARTAO", "CARTAO_CREDITO", "CREDIT_CARD"];

  if (!creditTypes.includes(paymentMethod.type)) {
    return null;
  }

  const card = await cardRepository.findBillingProfileById(input.cardId, input.userId);

  if (!card?.closingDay || !card.dueDay) {
    throw new CreditCardTransactionBuilderError(
      "Configure dia de fechamento e vencimento do cartão antes de registrar a transação.",
    );
  }

  return {
    closingDay: card.closingDay,
    dueDay: card.dueDay,
  };
}
