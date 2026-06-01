import type { AccountType, PaymentMethodType } from "@prisma/client";

export interface CardRepositoryPort {
  belongsToUser(cardId: string, userId: string): Promise<boolean>;
  findBillingProfileById(
    cardId: string,
    userId: string,
  ): Promise<{ id: string; closingDay: number | null; dueDay: number | null } | null>;
}

export interface FinancialAccountRecord {
  id: string;
  type: AccountType;
  name: string;
}

export interface FinancialAccountRepositoryPort {
  belongsToUser(accountId: string, userId: string): Promise<boolean>;
  findActiveByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<FinancialAccountRecord | null>;
}

export interface CategoryRepositoryPort {
  belongsToUser(categoryId: string, userId: string): Promise<boolean>;
}

export interface PaymentMethodRecord {
  id: string;
  type: PaymentMethodType;
  name: string;
}

export interface PaymentMethodRepositoryPort {
  belongsToUser(paymentMethodId: string, userId: string): Promise<boolean>;
  findActiveByIdForUser(
    paymentMethodId: string,
    userId: string,
  ): Promise<PaymentMethodRecord | null>;
}
