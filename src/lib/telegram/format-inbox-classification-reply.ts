import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";

/**
 * Formata resposta Telegram com sugestão de classificação (sem efetivar).
 * Integração futura: enviar após processamento do item na inbox via webhook/worker.
 */
export function formatInboxClassificationReply(
  rawContent: string,
  suggestion: InboxClassificationSuggestion,
): string {
  const categoryLine =
    suggestion.categoriaPrincipal && suggestion.subcategoria
      ? `${suggestion.categoriaPrincipal} &gt; ${suggestion.subcategoria}`
      : suggestion.categoryName ?? suggestion.categoriaPrincipal ?? "—";

  const readyLine = suggestion.readyToConfirm
    ? "\n✓ Pronto para efetivar (confirme no painel web)."
    : "\nRevise no painel web antes de efetivar.";

  return [
    `Recebido: <i>${escapeTelegramHtml(rawContent.slice(0, 120))}</i>`,
    "",
    "<b>Sugestão:</b>",
    categoryLine,
    `Confiança: ${suggestion.confidence}%`,
    "",
    `<i>${escapeTelegramHtml(suggestion.explanation)}</i>`,
    readyLine,
  ].join("\n");
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
