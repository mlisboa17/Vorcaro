import type { PrismaClient } from "@prisma/client";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRecord,
  PaymentMethodRepositoryPort,
} from "../../domain/ports/ownership-validation.port";

export class PrismaFinancialAccountRepository implements FinancialAccountRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async belongsToUser(accountId: string, userId: string): Promise<boolean> {
    const account = await this.db.financialAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true },
    });
    return account !== null;
  }

  async findActiveByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<import("../../domain/ports/ownership-validation.port").FinancialAccountRecord | null> {
    const account = await this.db.financialAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true, type: true, name: true },
    });
    return account;
  }
}

export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async belongsToUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.db.category.findFirst({
      where: { id: categoryId, userId, isActive: true },
      select: { id: true },
    });
    return category !== null;
  }
}

export class PrismaPaymentMethodRepository implements PaymentMethodRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async belongsToUser(paymentMethodId: string, userId: string): Promise<boolean> {
    const method = await this.db.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId, isActive: true },
      select: { id: true },
    });
    return method !== null;
  }

  async findActiveByIdForUser(
    paymentMethodId: string,
    userId: string,
  ): Promise<PaymentMethodRecord | null> {
    const method = await this.db.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId, isActive: true },
      select: { id: true, type: true, name: true },
    });

    return method;
  }
}

export class PrismaCardOwnershipRepository implements CardRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async belongsToUser(cardId: string, userId: string): Promise<boolean> {
    const card = await this.db.card.findFirst({
      where: { id: cardId, userId, isActive: true },
      select: { id: true },
    });
    return card !== null;
  }

  async findBillingProfileById(cardId: string, userId: string) {
    return this.db.card.findFirst({
      where: { id: cardId, userId, isActive: true },
      select: { id: true, closingDay: true, dueDay: true },
    });
  }
}
