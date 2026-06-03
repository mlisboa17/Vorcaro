import type { ExtractedTransactionType } from "@/modules/financial-inbox/domain/ports/ai-service.port";

export type ClassificationSource = "history" | "similarity" | "rule" | "ai";

/** @deprecated Use `"rule"` — mantido para leitura de dados legados. */
export type LegacyClassificationSource = ClassificationSource | "keyword";

export type ConfidenceBand = "high" | "medium" | "low";

export type InstallmentClassificationHint = {
  descricaoBase: string;
  numeroParcela: number;
  totalParcelas: number;
  installmentGroup: string | null;
  hadInstallmentMarker: boolean;
};

export interface InboxClassificationSuggestion {
  categoryId: string | null;
  subcategoriaId: string | null;
  categoriaPrincipal: string | null;
  subcategoria: string | null;
  categoryName: string | null;
  accountId: string | null;
  cardId: string | null;
  paymentMethodId: string | null;
  expenseType: ExtractedTransactionType | null;
  confidence: number;
  source: ClassificationSource;
  /** Explicação exibida na UI (“Por que sugerimos isso?”). */
  explanation: string;
  /** Alias semântico da sprint — mesmo conteúdo de `explanation`. */
  reason: string;
  readyToConfirm: boolean;
  historyMatchCount?: number;
  installment?: InstallmentClassificationHint;
  possibleDuplicate?: boolean;
  duplicateReason?: string;
  duplicateConfidence?: number;
  isPotentialReimbursement?: boolean;
  reimbursementReason?: string;
  reimbursementConfidence?: number;
}

export function normalizeClassificationSource(
  source: LegacyClassificationSource | string | undefined,
): ClassificationSource {
  if (source === "keyword") return "rule";
  if (source === "history" || source === "similarity" || source === "rule" || source === "ai") {
    return source;
  }
  return "ai";
}

export function classificationSourceLabel(source: ClassificationSource): string {
  switch (source) {
    case "history":
      return "Histórico";
    case "similarity":
      return "Similaridade";
    case "rule":
      return "Regra";
    case "ai":
      return "IA";
  }
}

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 90) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export function confidenceBandLabel(band: ConfidenceBand): string {
  switch (band) {
    case "high":
      return "Alta confiança";
    case "medium":
      return "Revisar";
    case "low":
      return "Verificar";
  }
}

export const READY_TO_CONFIRM_THRESHOLD = 95;
