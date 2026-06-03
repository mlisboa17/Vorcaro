import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";

export function mergeClassificationIntoExtraction(
  extraction: FinancialExtraction,
  suggestion: InboxClassificationSuggestion,
): FinancialExtraction {
  const next: FinancialExtraction = {
    ...extraction,
    confidence: { ...extraction.confidence },
    missingFields: [...extraction.missingFields],
  };

  if (suggestion.categoryId) {
    next.categoryId = suggestion.categoryId;
    next.category = suggestion.categoryName;
    next.categoriaPrincipal = suggestion.categoriaPrincipal;
    next.subcategoria = suggestion.subcategoria;
    next.confidence.categoryId = suggestion.confidence / 100;
  }

  if (suggestion.expenseType && suggestion.expenseType !== "UNKNOWN") {
    next.type = suggestion.expenseType;
    next.confidence.type = suggestion.confidence / 100;
  }

  if (suggestion.accountId) next.financialAccountId = suggestion.accountId;
  if (suggestion.cardId) next.cardId = suggestion.cardId;
  if (suggestion.paymentMethodId) next.paymentMethodId = suggestion.paymentMethodId;

  (next as FinancialExtraction & { inboxClassification?: InboxClassificationSuggestion }).inboxClassification =
    suggestion;

  return next;
}

export function readClassificationFromExtraction(
  extraction: FinancialExtraction | null | undefined,
): InboxClassificationSuggestion | null {
  if (!extraction) return null;
  const embedded = (
    extraction as FinancialExtraction & { inboxClassification?: InboxClassificationSuggestion }
  ).inboxClassification;
  if (embedded) return embedded;

  if (!extraction.categoryId && !extraction.categoriaPrincipal) return null;

  return {
    categoryId: extraction.categoryId ?? null,
    subcategoriaId: null,
    categoriaPrincipal: extraction.categoriaPrincipal ?? null,
    subcategoria: extraction.subcategoria ?? null,
    categoryName: extraction.category ?? null,
    accountId: extraction.financialAccountId ?? null,
    cardId: extraction.cardId ?? null,
    paymentMethodId: extraction.paymentMethodId ?? null,
    expenseType: extraction.type !== "UNKNOWN" ? extraction.type : "EXPENSE",
    confidence: Math.round((extraction.confidence.categoryId ?? 0.7) * 100),
    source: "rule",
    explanation: "Sugestão da extração enriquecida.",
    reason: "Sugestão da extração enriquecida.",
    readyToConfirm: Boolean(extraction.categoryId),
  };
}
