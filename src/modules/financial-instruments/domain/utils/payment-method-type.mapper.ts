import type { PaymentMethodType } from "@prisma/client";

const PAYMENT_METHOD_TYPE_ALIASES: Record<string, PaymentMethodType> = {
  DINHEIRO: "DINHEIRO",
  CASH: "DINHEIRO",
  PIX: "PIX",
  CARTAO: "CARTAO",
  CARTAO_CREDITO: "CARTAO",
  CREDIT_CARD: "CARTAO_CREDITO",
  CARTAO_DEBITO: "CARTAO_DEBITO",
  DEBIT_CARD: "CARTAO_DEBITO",
  BOLETO: "BOLETO",
  TRANSFERENCIA: "TRANSFERENCIA",
  TRANSFERENCIA_BANCARIA: "TRANSFERENCIA_BANCARIA",
  BANK_TRANSFER: "TRANSFERENCIA_BANCARIA",
  CARTEIRA_DIGITAL: "CARTEIRA_DIGITAL",
  DEBITO_AUTOMATICO: "DEBITO_AUTOMATICO",
  OTHER: "OTHER",
};

export function mapExtractedPaymentMethodType(
  value: string | null | undefined,
): PaymentMethodType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  return PAYMENT_METHOD_TYPE_ALIASES[normalized] ?? null;
}

export function isCashPaymentMethodType(type: PaymentMethodType | null | undefined): boolean {
  return type === "DINHEIRO" || type === "CASH";
}

export function isCardPaymentMethodType(type: PaymentMethodType | null | undefined): boolean {
  return (
    type === "CARTAO" ||
    type === "CARTAO_CREDITO" ||
    type === "CARTAO_DEBITO" ||
    type === "CREDIT_CARD" ||
    type === "DEBIT_CARD"
  );
}
