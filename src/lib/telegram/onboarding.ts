import type { AccountType, PaymentMethodType } from "@prisma/client";
import type { TelegramInlineKeyboardButton } from "./telegram-inline-actions";

/** Onboarding é necessário enquanto o usuário não tiver conta E forma de pagamento. */
export function needsOnboarding(accountsCount: number, paymentsCount: number): boolean {
  return accountsCount === 0 || paymentsCount === 0;
}

/** Só o passo de conta é necessário. */
export function needsAccount(accountsCount: number): boolean {
  return accountsCount === 0;
}

export type AccountNameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "too_short" | "cancel" | "command" };

/** Valida o nome de conta digitado no chat. */
export function validateAccountName(text: string | null | undefined): AccountNameValidation {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.toLowerCase() === "cancelar") return { ok: false, reason: "cancel" };
  if (trimmed.startsWith("/")) return { ok: false, reason: "command" };
  if (trimmed.length < 2) return { ok: false, reason: "too_short" };
  return { ok: true, name: trimmed.slice(0, 60) };
}

/** Infere o tipo da conta pelo nome, evitando um passo extra de seleção. */
export function inferAccountType(name: string): AccountType {
  const n = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\b(carteira|dinheiro|cash|especie|caixinha)\b/.test(n)) return "CASH";
  if (/\b(poupanca|poupança|savings)\b/.test(n)) return "SAVINGS";
  if (/\b(investimento|corretora|invest)\b/.test(n)) return "INVESTMENT";
  return "CHECKING";
}

export type PaymentNameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "too_short" | "cancel" | "command" };

/** Valida o nome da forma de pagamento digitada no chat. */
export function validatePaymentName(text: string | null | undefined): PaymentNameValidation {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.toLowerCase() === "cancelar") return { ok: false, reason: "cancel" };
  if (trimmed.startsWith("/")) return { ok: false, reason: "command" };
  if (trimmed.length < 2) return { ok: false, reason: "too_short" };
  return { ok: true, name: trimmed.slice(0, 60) };
}

/** Infere o tipo da forma de pagamento pelo nome. */
export function inferPaymentType(name: string): PaymentMethodType {
  const n = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\bpix\b/.test(n)) return "PIX";
  if (/\b(cr[eé]dito|credito|credit)\b/.test(n)) return "CREDIT_CARD";
  if (/\b(d[eé]bito|debito|debit)\b/.test(n)) return "DEBIT_CARD";
  if (/\bcart[aã]o\b/.test(n)) return "CREDIT_CARD"; // "cartão" sem qualificador → crédito
  if (/\b(dinheiro|especie|esp[eé]cie|cash)\b/.test(n)) return "CASH";
  if (/\b(boleto)\b/.test(n)) return "BOLETO";
  if (/\b(transfer[eê]ncia|ted|doc)\b/.test(n)) return "BANK_TRANSFER";
  return "OTHER";
}

// ─── Mensagens e teclados ─────────────────────────────────────────────────────

export const ONBOARDING_WELCOME =
  "👋 <b>Bem-vindo ao Vorcaro!</b>\n\nPra começar a registrar seus gastos e receitas, cadastre sua 1ª conta (ex.: Nubank, Carteira). Bora? 🚀";

export function buildWelcomeKeyboard(): TelegramInlineKeyboardButton[][] {
  return [[{ text: "➕ Cadastrar conta", callback_data: "onb_account" }]];
}

export function buildPaymentStepKeyboard(): TelegramInlineKeyboardButton[][] {
  return [[{ text: "➕ Cadastrar forma de pagamento", callback_data: "onb_payment" }]];
}

export const ONBOARDING_ACCOUNT_PROMPT =
  "🏦 Qual o nome da conta? (ex.: <b>Conta Corrente</b>, <b>Carteira</b>)";

export const ONBOARDING_PAYMENT_PROMPT =
  "💳 Qual forma de pagamento você mais usa? (ex.: <b>Pix</b>, <b>Cartão de crédito</b>, <b>Dinheiro</b>)";

/** callback_data simples do onboarding. */
export function parseOnboardingCallback(data: string): "account" | "payment" | null {
  if (data === "onb_account") return "account";
  if (data === "onb_payment") return "payment";
  return null;
}
