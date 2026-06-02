import { prisma } from "@/lib/prisma";
import {
  DeleteCardUseCase,
  DeleteFinancialAccountUseCase,
  DeletePaymentMethodUseCase,
  UpdateCardUseCase,
  UpdateFinancialAccountUseCase,
  UpdatePaymentMethodUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import {
  PrismaCardRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

export function buildInstrumentUseCases() {
  const accountRepository = new PrismaFinancialAccountRepository(prisma);
  const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
  const cardRepository = new PrismaCardRepository(prisma);

  return {
    accountRepository,
    paymentMethodRepository,
    cardRepository,
    updateAccount: new UpdateFinancialAccountUseCase(accountRepository),
    deleteAccount: new DeleteFinancialAccountUseCase(accountRepository),
    updatePaymentMethod: new UpdatePaymentMethodUseCase(paymentMethodRepository),
    deletePaymentMethod: new DeletePaymentMethodUseCase(paymentMethodRepository),
    updateCard: new UpdateCardUseCase(cardRepository),
    deleteCard: new DeleteCardUseCase(cardRepository),
  };
}
