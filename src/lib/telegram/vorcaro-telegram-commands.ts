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

const VORCARO_COMMAND_QUESTIONS: Record<string, string> = {
  "/status": "Como estou financeiramente?",
  "/alertas": "Quais são meus maiores riscos e alertas hoje?",
  "/gastos": "Onde estou perdendo dinheiro?",
  "/metas": "Como estão minhas metas financeiras?",
  "/oportunidades": "Quais oportunidades de economia você identificou?",
  "/recebiveis": "Como estão meus recebíveis e reembolsos?",
  "/vorcaro": "O que preciso resolver hoje?",
  "/help_vorcaro":
    "Comandos Vorcaro:\n/status — saúde financeira\n/alertas — riscos\n/gastos — vazamentos\n/metas — planejamento\n/oportunidades — economias\n/recebiveis — contas a receber\n\nOu pergunte: Vorcaro, <sua pergunta>",
};

export function parseVorcaroTelegramCommand(text: string): string | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
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

export function shouldRouteToVorcaroChat(text: string): boolean {
  return parseVorcaroTelegramCommand(text) != null || isVorcaroFreeTextQuestion(text);
}

export function resolveVorcaroTelegramQuestion(text: string): string {
  const commandQuestion = parseVorcaroTelegramCommand(text);
  if (commandQuestion) return commandQuestion;
  return normalizeVorcaroFreeText(text);
}
