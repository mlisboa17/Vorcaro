import type { PrismaClient } from "@prisma/client";
import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { buildCognitiveTransactionKeyboard, type TelegramInlineKeyboardButton } from "./telegram-inline-actions";

/** Formata o texto do card de lançamento detectado (mesmo layout do 1º envio). */
export function formatCognitiveCardText(extraction: {
  description?: string | null;
  amount?: number | null;
  date?: string | null;
  type?: string | null;
}): string {
  const valueStr = Math.abs(extraction.amount || 0).toFixed(2).replace(".", ",");
  const typeStr = extraction.type === "INCOME" ? "Receita" : "Despesa";
  const local = extraction.description || "—";
  const date = extraction.date || "—";
  return (
    `📝 <b>Lançamento Inteligente Detectado:</b>\n` +
    `🔹 <b>Estabelecimento:</b> ${local}\n` +
    `🔹 <b>Valor:</b> R$ ${valueStr}\n` +
    `🔹 <b>Data:</b> ${date}\n` +
    `🔹 <b>Tipo:</b> ${typeStr}\n\n` +
    `Confirma os dados?`
  );
}

/**
 * Carrega a extração pendente de um item e devolve o card pronto (texto + teclado)
 * para re-render após uma edição inline. Retorna null se não houver extração.
 */
export async function loadCognitiveCard(
  prisma: PrismaClient,
  inboxItemId: string,
): Promise<{ text: string; keyboard: TelegramInlineKeyboardButton[][]; extraction: FinancialExtraction } | null> {
  const repo = new PrismaExtractionResultRepository(prisma);
  const row = await repo.findLatestByInboxItemId(inboxItemId);
  const extraction = row?.extractedData as FinancialExtraction | undefined;
  if (!extraction) return null;
  return {
    text: formatCognitiveCardText(extraction),
    keyboard: buildCognitiveTransactionKeyboard(inboxItemId),
    extraction,
  };
}
