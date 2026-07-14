export const VORCARO_TELEGRAM_COMMANDS = [
  "/status",
  "/alertas",
  "/gastos",
  "/metas",
  "/oportunidades",
  "/recebiveis",
  "/vorcaro",
  "/help_vorcaro",
] as const;

export const VORCARO_ASSISTANT_INTRO = `Sou Vorcaro.

Posso ajudar com:
• Status financeiro
• Metas
• Recebíveis
• Pendências
• Estratégia patrimonial

Use /status, /metas, /alertas, /recebiveis ou pergunte em linguagem natural.`;

const VORCARO_COMMAND_QUESTIONS: Record<string, string> = {
  "/status": "Como estou financeiramente?",
  "/alertas": "Quais são meus maiores riscos e alertas hoje?",
  "/gastos": "Onde estou perdendo dinheiro?",
  "/metas": "Como estão minhas metas financeiras?",
  "/oportunidades": "Quais oportunidades de economia você identificou?",
  "/recebiveis": "Como estão meus recebíveis e reembolsos?",
  "/help_vorcaro":
    "Comandos Vorcaro:\n/status — saúde financeira\n/alertas — riscos\n/gastos — vazamentos\n/metas — planejamento\n/oportunidades — economias\n/recebiveis — contas a receber\n/vorcaro — menu do assistente\n\nOu pergunte: Vorcaro, <sua pergunta>",
};

export function isVorcaroAssistantCommand(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return lower === "/vorcaro" || lower.startsWith("/vorcaro ");
}

export function parseVorcaroTelegramCommand(text: string): string | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (isVorcaroAssistantCommand(trimmed)) {
    return null;
  }
  for (const cmd of VORCARO_TELEGRAM_COMMANDS) {
    if (lower === cmd || lower.startsWith(`${cmd} `)) {
      return VORCARO_COMMAND_QUESTIONS[cmd] ?? trimmed;
    }
  }
  return null;
}

export function isVorcaroFreeTextQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (/^vorcaro[,\s]/i.test(trimmed)) {
    return trimmed.replace(/^vorcaro[,\s]*/i, "").length >= 3;
  }
  return false;
}

export function normalizeVorcaroFreeText(text: string): string {
  return text.trim().replace(/^vorcaro[,\s]*/i, "");
}

import {
  isLikelyActionConfirmationMessage,
} from "@/modules/vorcaro/actions/domain/services/vorcaro-action-confirmation-patterns";

export function shouldRouteToVorcaroChat(text: string): boolean {
  return (
    parseVorcaroTelegramCommand(text) != null ||
    isVorcaroFreeTextQuestion(text) ||
    isLikelyActionConfirmationMessage(text)
  );
}

const MONETARY_VALUE_PATTERN = /\d+[.,]\d{2}(?!\d)/;

/**
 * Sinal de que a mensagem é uma tentativa de lançamento financeiro (ex.: "Ifood 45,90"),
 * não uma conversa casual. Usado para decidir se uma mensagem livre deve virar um item
 * pendente na Caixa Financeira ou ser respondida pelo assistente Vorcaro.
 */
export function looksLikeExpenseEntry(text: string): boolean {
  return MONETARY_VALUE_PATTERN.test(text);
}

export function resolveVorcaroTelegramQuestion(text: string): string {
  const commandQuestion = parseVorcaroTelegramCommand(text);
  if (commandQuestion) return commandQuestion;
  if (isLikelyActionConfirmationMessage(text)) return text.trim();
  return normalizeVorcaroFreeText(text);
}
