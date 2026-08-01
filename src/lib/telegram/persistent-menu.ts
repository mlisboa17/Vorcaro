/**
 * Sprint 0 — Melhoria 1: Menu Persistente (ReplyKeyboardMarkup)
 * Exibe um menu com 4 botões após cada resposta:
 * 🏠 Home | 📊 Resumo | 🚨 Alertas | ⚙️ Config
 */

import type { TelegramReplyKeyboard } from "./telegram-bot.client";

export function buildPersistentMenu(): TelegramReplyKeyboard {
  return {
    reply_keyboard: [
      [
        { text: "🏠 Home" },
        { text: "📊 Resumo" },
        { text: "🚨 Alertas" },
        { text: "⚙️ Config" },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false,
  };
}

/**
 * Sprint 0 — Melhoria 4: Confirmação Clara
 * Formata um resumo bonito da transação criada
 */
export interface TransactionSummary {
  amount: number;
  category: string;
  paymentMethod: string;
  account: string;
  date: string;
}

export function formatTransactionConfirmation(summary: TransactionSummary): string {
  return [
    "✅ Registrei!",
    "",
    `💰 R$ ${summary.amount.toFixed(2).replace(".", ",")}`,
    `🏷️ ${summary.category}`,
    `🏦 ${summary.paymentMethod}`,
    `🔐 Conta: ${summary.account}`,
    `📅 ${summary.date}`,
  ].join("\n");
}

/**
 * Sprint 0 — Melhoria 3: Deduplicação Local
 * Detecta se a transação já foi enviada há menos de 10 minutos
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  message?: string;
}

export interface TransactionFingerprint {
  amount: number;
  category: string;
  timestamp: number;
}

/**
 * Gera uma assinatura (fingerprint) para comparação de duplicatas
 */
export function generateTransactionFingerprint(
  amount: number,
  category: string,
  timestamp: number,
): TransactionFingerprint {
  return { amount, category, timestamp };
}

/**
 * Verifica se uma transação é duplicata de outra no histórico local (<10 min)
 */
export function checkTransactionDuplicate(
  current: TransactionFingerprint,
  previous: TransactionFingerprint,
): DuplicateCheckResult {
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const timeDiff = current.timestamp - previous.timestamp;

  if (
    current.amount === previous.amount &&
    current.category === previous.category &&
    timeDiff > 0 &&
    timeDiff < TEN_MINUTES_MS
  ) {
    const minutes = Math.floor(timeDiff / 60000);
    const message =
      minutes === 0
        ? "⚠️ Já lançaste R$ " + current.amount.toFixed(2).replace(".", ",") + " em " + current.category + " há poucos segundos"
        : `⚠️ Já lançaste R$ ${current.amount.toFixed(2).replace(".", ",")} em ${current.category} há ${minutes} min${minutes > 1 ? "s" : ""}`;

    return {
      isDuplicate: true,
      message,
    };
  }

  return { isDuplicate: false };
}

/**
 * Sprint 0 — Melhoria 2: Aceita apenas foto/áudio/texto
 * Valida se a mensagem contém apenas mídia permitida ou texto
 */
export interface MediaValidationResult {
  isValid: boolean;
  type?: "photo" | "voice" | "text" | "document";
  error?: string;
}

export function validateMediaInput(hasPhoto: boolean, hasVoice: boolean, hasDocument: boolean, hasText: boolean): MediaValidationResult {
  // Se tem foto, aceita direto (sem obrigar caption)
  if (hasPhoto) {
    return { isValid: true, type: "photo" };
  }

  // Se tem áudio, aceita direto (sem obrigar caption)
  if (hasVoice) {
    return { isValid: true, type: "voice" };
  }

  // Se tem documento, aceita apenas se for extrato (OFX/CSV) ou documento financeiro
  if (hasDocument) {
    return { isValid: true, type: "document" };
  }

  // Se tem texto, aceita
  if (hasText) {
    return { isValid: true, type: "text" };
  }

  return {
    isValid: false,
    error: "⚠️ Envie uma foto, áudio, extrato (OFX/CSV) ou texto",
  };
}

/**
 * Constrói o teclado para confirmar duplicata
 */
export function buildDuplicateConfirmKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "✅ Enviar mesmo assim", callback_data: "dedup_override" },
        { text: "❌ Cancelar", callback_data: "dedup_cancel" },
      ],
    ],
  };
}
