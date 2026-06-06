import type { ClassificationResult } from "../../domain/types/financial-document.types";
import type { ParsedFinancialDocument } from "../../domain/types/financial-document.types";
import { buildPartiesMetadata } from "../../domain/services/financial-parties-metadata.service";
import { displayPartyValue } from "../../domain/services/financial-parties-metadata.service";
import { PARTIES_NOT_IDENTIFIED } from "../../domain/types/financial-parties-metadata.types";

function methodLabel(method: string): string {
  if (method === "PIX") return "PIX identificado";
  return "Documento identificado";
}

export function formatTelegramDocumentSummary(input: {
  parsed: ParsedFinancialDocument;
  classification: ClassificationResult;
  categoryLabel?: string | null;
}): string {
  const { parsed, classification } = input;
  const amount = parsed.fields.amount;
  const parties = buildPartiesMetadata(parsed.fields);
  const category = input.categoryLabel ?? PARTIES_NOT_IDENTIFIED;

  return [
    `📝 ${methodLabel(parsed.method)}`,
    "",
    "Valor:",
    amount != null ? `R$ ${amount.toFixed(2).replace(".", ",")}` : PARTIES_NOT_IDENTIFIED,
    "",
    "Quem pagou:",
    displayPartyValue(parties.payerName),
    "",
    "Quem recebeu:",
    displayPartyValue(parties.receiverName),
    "",
    "Categoria sugerida:",
    category,
    "",
    "Confiança:",
    `${classification.confidence}%`,
  ].join("\n");
}

export const TELEGRAM_DOCUMENT_RECEIVED = "Documento recebido.\nProcessando…";

export const TELEGRAM_PASSWORD_REQUIRED =
  "Este documento está protegido por senha.\n\nInforme a senha no dashboard: /dashboard/import";

export const TELEGRAM_REVIEW_REQUIRED =
  "Informações críticas ausentes ou confiança insuficiente. Revise em /dashboard/import/review antes de aprovar.";

export const TELEGRAM_INSTALLMENT_BATCH_DETECTED =
  "Detectei compras parceladas nesta fatura.\n\nRevise as parcelas em /dashboard/import/review antes de confirmar.";

export function formatTelegramInstallmentBatchSummary(
  purchases: Array<{
    merchant: string;
    currentInstallment: number;
    totalInstallments: number;
    installmentAmount: number;
  }>,
): string {
  const example = purchases[0];
  const lines = [
    "Detectei compras parceladas nesta fatura.",
    "",
    "Exemplo:",
    example
      ? `${example.merchant} — parcela ${example.currentInstallment}/${example.totalInstallments} — R$ ${example.installmentAmount.toFixed(2).replace(".", ",")}`
      : "—",
    "",
    "Deseja revisar as parcelas no dashboard?",
    "/dashboard/import/review",
  ];
  return lines.join("\n");
}
