import { describe, expect, it } from "vitest";
import { formatInboxClassificationReply } from "../format-inbox-classification-reply";
import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";

const baseSuggestion: InboxClassificationSuggestion = {
  categoryId: "cat-fuel",
  subcategoriaId: "cat-fuel",
  categoriaPrincipal: "Transporte",
  subcategoria: "Combustível",
  categoryName: "Transporte → Combustível",
  accountId: null,
  cardId: null,
  paymentMethodId: null,
  expenseType: "EXPENSE",
  confidence: 98,
  source: "history",
  explanation: "Baseado em 5 lançamentos anteriores.",
  reason: "Baseado em 5 lançamentos anteriores.",
  readyToConfirm: true,
};

describe("formatInboxClassificationReply", () => {
  it("formata mensagem Telegram com sugestão e confiança", () => {
    const message = formatInboxClassificationReply("Abasteci R$ 250", baseSuggestion);

    expect(message).toContain("Abasteci R$ 250");
    expect(message).toContain("Transporte &gt; Combustível");
    expect(message).toContain("Confiança: 98%");
    expect(message).toContain("Pronto para efetivar");
  });

  it("indica revisão quando confiança é baixa", () => {
    const message = formatInboxClassificationReply("Compra genérica", {
      ...baseSuggestion,
      confidence: 60,
      readyToConfirm: false,
    });

    expect(message).toContain("Revise no painel web");
  });
});
