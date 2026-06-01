import type { AccountType, CardBrand, CardType, PaymentMethodType } from "@prisma/client";

export interface FinancialAccountRecord {
  id: string;
  userId: string;
  name: string;
  institutionName: string | null;
  type: AccountType;
  currency: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFinancialAccountInput {
  userId: string;
  name: string;
  institutionName?: string;
  type: AccountType;
  currency?: string;
  saldoInicial?: number;
}

export interface PaymentMethodRecord {
  id: string;
  userId: string;
  name: string;
  type: PaymentMethodType;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodInput {
  userId: string;
  name: string;
  type: PaymentMethodType;
  isDefault?: boolean;
}

export interface CardRecord {
  id: string;
  userId: string;
  financialAccountId: string | null;
  name: string;
  institutionName: string | null;
  brand: CardBrand;
  type: CardType;
  lastFourDigits: string | null;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardInput {
  userId: string;
  name: string;
  financialAccountId?: string;
  institutionName?: string;
  brand: CardBrand;
  type: CardType;
  lastFourDigits?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface UpdateCardInput {
  name?: string;
  financialAccountId?: string | null;
  institutionName?: string | null;
  brand?: CardBrand;
  type?: CardType;
  lastFourDigits?: string | null;
  creditLimit?: number | null;
  closingDay?: number | null;
  dueDay?: number | null;
  isActive?: boolean;
}

export interface InstrumentLookupInput {
  userId: string;
  financialInstitution?: string | null;
  cardLastFourDigits?: string | null;
  cardBrand?: string | null;
  paymentMethodType?: string | null;
}

export interface InstrumentLookupResult {
  financialAccountId?: string;
  paymentMethodId?: string;
  cardId?: string;
}

export interface FinancialAccountRepositoryPort {
  listByUserId(userId: string): Promise<FinancialAccountRecord[]>;
  create(input: CreateFinancialAccountInput): Promise<FinancialAccountRecord>;
  belongsToUser(accountId: string, userId: string): Promise<boolean>;
  findByInstitution(userId: string, institutionName: string): Promise<FinancialAccountRecord | null>;
}

export interface PaymentMethodRepositoryPort {
  listByUserId(userId: string): Promise<PaymentMethodRecord[]>;
  create(input: CreatePaymentMethodInput): Promise<PaymentMethodRecord>;
  belongsToUser(paymentMethodId: string, userId: string): Promise<boolean>;
  findByType(userId: string, type: PaymentMethodType): Promise<PaymentMethodRecord | null>;
}

export interface CardRepositoryPort {
  listByUserId(userId: string): Promise<CardRecord[]>;
  create(input: CreateCardInput): Promise<CardRecord>;
  update(id: string, userId: string, input: UpdateCardInput): Promise<CardRecord | null>;
  belongsToUser(cardId: string, userId: string): Promise<boolean>;
  findByLastFourDigits(
    userId: string,
    lastFourDigits: string,
    institutionName?: string | null,
  ): Promise<CardRecord | null>;
}

export interface InstrumentLookupPort {
  resolve(input: InstrumentLookupInput): Promise<InstrumentLookupResult>;
}
