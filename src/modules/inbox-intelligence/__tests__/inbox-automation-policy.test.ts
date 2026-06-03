import { describe, expect, it } from "vitest";
import {
  AUTO_EFFECTUATE_THRESHOLD,
  BATCH_CONFIRM_THRESHOLD,
  buildAutomationMessages,
  buildInboxSmartBatchPlan,
  formatCategoryGroupLabel,
  resolveAutomationTier,
  summarizeCategoryGroups,
} from "../domain/types/inbox-automation-policy";
import type { InboxClassificationSuggestion } from "../domain/types/inbox-classification";

function suggestion(
  partial: Partial<InboxClassificationSuggestion> & Pick<InboxClassificationSuggestion, "confidence">,
): InboxClassificationSuggestion {
  return {
    categoryId: partial.categoryId ?? "cat-1",
    subcategoriaId: partial.subcategoriaId ?? null,
    categoriaPrincipal: partial.categoriaPrincipal ?? "Alimentação",
    subcategoria: partial.subcategoria ?? "Restaurantes",
    categoryName: partial.categoryName ?? "Alimentação → Restaurantes",
    accountId: null,
    cardId: null,
    paymentMethodId: null,
    expenseType: "EXPENSE",
    source: "history",
    explanation: partial.explanation ?? "teste",
    reason: partial.reason ?? partial.explanation ?? "teste",
    readyToConfirm: partial.confidence >= AUTO_EFFECTUATE_THRESHOLD,
    ...partial,
  };
}

describe("inbox-automation-policy", () => {
  it("resolve faixas de automação", () => {
    expect(resolveAutomationTier(96, true)).toBe("auto");
    expect(resolveAutomationTier(AUTO_EFFECTUATE_THRESHOLD, true)).toBe("auto");
    expect(resolveAutomationTier(85, true)).toBe("batch");
    expect(resolveAutomationTier(BATCH_CONFIRM_THRESHOLD, true)).toBe("batch");
    expect(resolveAutomationTier(79, true)).toBe("individual");
    expect(resolveAutomationTier(50, false)).toBe("manual");
  });

  it("agrupa transações por categoria para confirmação em lote", () => {
    const plan = buildInboxSmartBatchPlan([
      { inboxItemId: "1", suggestion: suggestion({ confidence: 96, subcategoria: "Restaurantes" }) },
      { inboxItemId: "2", suggestion: suggestion({ confidence: 98, subcategoria: "Restaurantes" }) },
      { inboxItemId: "3", suggestion: suggestion({ confidence: 97, categoriaPrincipal: "Transporte", subcategoria: "Combustível", categoryName: "Transporte → Combustível" }) },
      { inboxItemId: "4", suggestion: suggestion({ confidence: 88, subcategoria: "Mercado", categoryName: "Alimentação → Mercado" }) },
      { inboxItemId: "5", suggestion: suggestion({ confidence: 60 }) },
    ]);

    expect(plan.auto.inboxItemIds).toEqual(["1", "2", "3"]);
    expect(plan.batch.inboxItemIds).toEqual(["4"]);
    expect(plan.individual.inboxItemIds).toEqual(["5"]);
    expect(plan.auto.groups[0]?.count).toBe(2);
    expect(formatCategoryGroupLabel(suggestion({ confidence: 96 }))).toBe(
      "Alimentação > Restaurantes",
    );
  });

  it("resume grupos excedentes como Outras categorias", () => {
    const groups = summarizeCategoryGroups(
      [
        { label: "A", count: 5, inboxItemIds: ["1"] },
        { label: "B", count: 4, inboxItemIds: ["2"] },
        { label: "C", count: 3, inboxItemIds: ["3"] },
        { label: "D", count: 2, inboxItemIds: ["4"] },
        { label: "E", count: 1, inboxItemIds: ["5"] },
        { label: "F", count: 1, inboxItemIds: ["6"] },
      ],
      4,
    );

    expect(groups).toHaveLength(5);
    expect(groups[4]?.label).toBe("Outras categorias");
    expect(groups[4]?.count).toBe(2);
  });

  it("gera mensagens de automação por faixa", () => {
    const plan = buildInboxSmartBatchPlan([
      { inboxItemId: "1", suggestion: suggestion({ confidence: 96 }) },
      { inboxItemId: "2", suggestion: suggestion({ confidence: 85 }) },
      { inboxItemId: "3", suggestion: suggestion({ confidence: 55 }) },
    ]);

    const messages = buildAutomationMessages(plan);

    expect(messages.auto).toContain("automaticamente");
    expect(messages.batch).toContain("Deseja efetivar todas?");
    expect(messages.individual).toContain("precisam da sua ajuda");
  });
});
