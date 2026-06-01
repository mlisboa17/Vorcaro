import type { AccountType, CardBrand, CardType, CategoryType, PaymentMethodType } from "@prisma/client";

export type ConfigCategoryType = CategoryType;
export type ConfigAccountType =
  | "CORRENTE"
  | "POUPANCA"
  | "INVESTIMENTO"
  | "CARTEIRA_DIGITAL"
  | "CARTEIRA_DINHEIRO"
  | "PJ";
export type ConfigPaymentMethodType =
  | "PIX"
  | "DINHEIRO"
  | "BOLETO"
  | "TRANSFERENCIA"
  | "CARTAO"
  | "DEBITO_AUTOMATICO";

const ACCOUNT_TO_PRISMA: Record<ConfigAccountType, AccountType> = {
  CORRENTE: "CORRENTE",
  POUPANCA: "POUPANCA",
  INVESTIMENTO: "INVESTIMENTO",
  CARTEIRA_DIGITAL: "CARTEIRA_DIGITAL",
  CARTEIRA_DINHEIRO: "CARTEIRA_DINHEIRO",
  PJ: "PJ",
};

const PRISMA_TO_ACCOUNT: Partial<Record<AccountType, ConfigAccountType>> = {
  CORRENTE: "CORRENTE",
  CONTA_CORRENTE: "CORRENTE",
  CHECKING: "CORRENTE",
  POUPANCA: "POUPANCA",
  SAVINGS: "POUPANCA",
  INVESTIMENTO: "INVESTIMENTO",
  INVESTMENT: "INVESTIMENTO",
  CARTEIRA_DIGITAL: "CARTEIRA_DIGITAL",
  CARTEIRA_DINHEIRO: "CARTEIRA_DINHEIRO",
  CASH: "CARTEIRA_DINHEIRO",
  PJ: "PJ",
};

const PAYMENT_TO_PRISMA: Record<ConfigPaymentMethodType, PaymentMethodType> = {
  PIX: "PIX",
  DINHEIRO: "DINHEIRO",
  BOLETO: "BOLETO",
  TRANSFERENCIA: "TRANSFERENCIA",
  CARTAO: "CARTAO",
  DEBITO_AUTOMATICO: "DEBITO_AUTOMATICO",
};

const PRISMA_TO_PAYMENT: Partial<Record<PaymentMethodType, ConfigPaymentMethodType>> = {
  PIX: "PIX",
  DINHEIRO: "DINHEIRO",
  CASH: "DINHEIRO",
  BOLETO: "BOLETO",
  TRANSFERENCIA: "TRANSFERENCIA",
  TRANSFERENCIA_BANCARIA: "TRANSFERENCIA",
  BANK_TRANSFER: "TRANSFERENCIA",
  CARTAO: "CARTAO",
  CARTAO_CREDITO: "CARTAO",
  CARTAO_DEBITO: "CARTAO",
  CREDIT_CARD: "CARTAO",
  DEBIT_CARD: "CARTAO",
  DEBITO_AUTOMATICO: "DEBITO_AUTOMATICO",
};

export function mapConfigAccountTypeToPrisma(type: ConfigAccountType): AccountType {
  return ACCOUNT_TO_PRISMA[type];
}

export function mapPrismaAccountTypeToConfig(type: AccountType): ConfigAccountType | null {
  return PRISMA_TO_ACCOUNT[type] ?? null;
}

export function mapConfigPaymentMethodTypeToPrisma(
  type: ConfigPaymentMethodType,
): PaymentMethodType {
  return PAYMENT_TO_PRISMA[type];
}

export function mapPrismaPaymentMethodTypeToConfig(
  type: PaymentMethodType,
): ConfigPaymentMethodType | null {
  return PRISMA_TO_PAYMENT[type] ?? null;
}

export function isCashWalletAccountType(type: AccountType): boolean {
  return type === "CARTEIRA_DINHEIRO" || type === "CASH";
}
