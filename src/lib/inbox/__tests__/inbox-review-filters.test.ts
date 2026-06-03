import { describe, expect, it } from "vitest";
import type { InboxItem } from "@/types/inbox";
import {
  EMPTY_INBOX_REVIEW_FILTERS,
  filterInboxItemsForReview,
} from "../inbox-review-filters";
import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";

function item(id: string, raw: string): InboxItem {
  return {
    id,
    userId: "u1",
    status: "NEEDS_CONFIRMATION",
    channel: "WEB_IMPORT",
    rawContent: raw,
    channelMeta: null,
    metadata: null,
    errorMessage: null,
    processedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("filterInboxItemsForReview — intelligence", () => {
  const items = [item("1", "OUTBACK"), item("2", "IFOOD"), item("3", "UBER")];

  const classifications: Record<string, InboxClassificationSuggestion> = {
    "1": {
      categoryId: "c1",
      subcategoriaId: null,
      categoriaPrincipal: "Alimentação",
      subcategoria: "Restaurantes",
      categoryName: "Alimentação",
      accountId: null,
      cardId: null,
      paymentMethodId: null,
      expenseType: "EXPENSE",
      confidence: 96,
      source: "history",
      explanation: "histórico",
      reason: "histórico",
      readyToConfirm: true,
      possibleDuplicate: true,
    },
    "2": {
      categoryId: null,
      subcategoriaId: null,
      categoriaPrincipal: null,
      subcategoria: null,
      categoryName: null,
      accountId: null,
      cardId: null,
      paymentMethodId: null,
      expenseType: "EXPENSE",
      confidence: 50,
      source: "ai",
      explanation: "ia",
      reason: "ia",
      readyToConfirm: false,
    },
    "3": {
      categoryId: "c2",
      subcategoriaId: null,
      categoriaPrincipal: "Transporte",
      subcategoria: null,
      categoryName: "Transporte",
      accountId: null,
      cardId: null,
      paymentMethodId: null,
      expenseType: "EXPENSE",
      confidence: 65,
      source: "rule",
      explanation: "regra",
      reason: "regra",
      readyToConfirm: false,
      isPotentialReimbursement: true,
    },
  };

  it("filtra alta confiança", () => {
    const filtered = filterInboxItemsForReview(
      items,
      { ...EMPTY_INBOX_REVIEW_FILTERS, highConfidenceOnly: true },
      undefined,
      classifications,
    );
    expect(filtered.map((i) => i.id)).toEqual(["1"]);
  });

  it("filtra sem categoria", () => {
    const filtered = filterInboxItemsForReview(
      items,
      { ...EMPTY_INBOX_REVIEW_FILTERS, noCategoryOnly: true },
      undefined,
      classifications,
    );
    expect(filtered.map((i) => i.id)).toEqual(["2"]);
  });

  it("filtra possíveis duplicados", () => {
    const filtered = filterInboxItemsForReview(
      items,
      { ...EMPTY_INBOX_REVIEW_FILTERS, possibleDuplicateOnly: true },
      undefined,
      classifications,
    );
    expect(filtered.map((i) => i.id)).toEqual(["1"]);
  });

  it("filtra possíveis reembolsos", () => {
    const filtered = filterInboxItemsForReview(
      items,
      { ...EMPTY_INBOX_REVIEW_FILTERS, potentialReimbursementOnly: true },
      undefined,
      classifications,
    );
    expect(filtered.map((i) => i.id)).toEqual(["3"]);
  });
});
