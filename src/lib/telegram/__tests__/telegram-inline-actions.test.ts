import { describe, expect, it } from "vitest";
import {
  buildActionProposalKeyboard,
  buildCategoryPickerKeyboard,
  buildCognitiveTransactionKeyboard,
  parseActionProposalCallback,
  parseCategoryPickCallback,
  parseCognitiveEditCallback,
  parseCognitiveTransactionCallback,
  parseFollowUpDismissCallback,
} from "@/lib/telegram/telegram-inline-actions";

describe("telegram-inline-actions", () => {
  it("monta teclado inline approve/reject", () => {
    const keyboard = buildActionProposalKeyboard([{ id: "prop-abc" }]);
    expect(keyboard[0][0]).toEqual({ text: "✅ Aprovar", callback_data: "approve:prop-abc" });
    expect(keyboard[0][1]).toEqual({ text: "❌ Rejeitar", callback_data: "reject:prop-abc" });
  });

  it("parseia callbacks de proposta", () => {
    expect(parseActionProposalCallback("approve:prop-1")).toEqual({
      action: "approve",
      proposalId: "prop-1",
    });
    expect(parseActionProposalCallback("reject:prop-2")).toEqual({
      action: "reject",
      proposalId: "prop-2",
    });
    expect(parseActionProposalCallback("invalid")).toBeNull();
  });

  it("parseia dismiss de follow-up", () => {
    expect(parseFollowUpDismissCallback("dismiss_fu:fu-1")).toBe("fu-1");
    expect(parseFollowUpDismissCallback("approve:x")).toBeNull();
  });

  it("monta teclado cognitivo com ações de edição (16.1.1)", () => {
    const kb = buildCognitiveTransactionKeyboard("inbox-1");
    // Linha 1: confirmar/descartar
    expect(kb[0][0]).toEqual({ text: "✅ Confirmar", callback_data: "cog_ack:inbox-1" });
    expect(kb[0][1]).toEqual({ text: "❌ Descartar", callback_data: "cog_rej:inbox-1" });
    // Linha 2: categoria/local/valor
    expect(kb[1][0]).toEqual({ text: "✏️ Categoria", callback_data: "cog_edit:cat:inbox-1" });
    expect(kb[1][1]).toEqual({ text: "📍 Local", callback_data: "cog_edit:local:inbox-1" });
    expect(kb[1][2]).toEqual({ text: "💰 Valor", callback_data: "cog_edit:valor:inbox-1" });
  });

  it("parseia callbacks de confirmar/descartar (compat)", () => {
    expect(parseCognitiveTransactionCallback("cog_ack:i1")).toEqual({ action: "ack", inboxItemId: "i1" });
    expect(parseCognitiveTransactionCallback("cog_rej:i1")).toEqual({ action: "rej", inboxItemId: "i1" });
    // Não deve casar com edição
    expect(parseCognitiveTransactionCallback("cog_edit:valor:i1")).toBeNull();
  });

  it("parseia callbacks de edição inline (16.1.1)", () => {
    expect(parseCognitiveEditCallback("cog_edit:cat:i1")).toEqual({ field: "cat", inboxItemId: "i1" });
    expect(parseCognitiveEditCallback("cog_edit:local:i1")).toEqual({ field: "local", inboxItemId: "i1" });
    expect(parseCognitiveEditCallback("cog_edit:valor:abc-123")).toEqual({ field: "valor", inboxItemId: "abc-123" });
    expect(parseCognitiveEditCallback("cog_edit:foo:i1")).toBeNull();
    expect(parseCognitiveEditCallback("cog_ack:i1")).toBeNull();
  });

  it("monta seletor de categorias 2-por-linha e parseia pick (16.1.4)", () => {
    const kb = buildCategoryPickerKeyboard([
      { id: "c1", name: "Alimentação" },
      { id: "c2", name: "Transporte" },
      { id: "c3", name: "Moradia" },
    ]);
    expect(kb).toHaveLength(2); // 3 itens → 2 linhas (2+1)
    expect(kb[0][0]).toEqual({ text: "Alimentação", callback_data: "cog_cat:c1" });
    expect(kb[0][1]).toEqual({ text: "Transporte", callback_data: "cog_cat:c2" });
    expect(kb[1][0]).toEqual({ text: "Moradia", callback_data: "cog_cat:c3" });

    expect(parseCategoryPickCallback("cog_cat:c1")).toEqual({ categoryId: "c1" });
    expect(parseCategoryPickCallback("cog_edit:cat:i1")).toBeNull();
  });

  it("trunca nomes de categoria muito longos no botão", () => {
    const kb = buildCategoryPickerKeyboard([{ id: "c1", name: "Categoria com nome exageradamente longo" }]);
    expect(kb[0][0].text.endsWith("…")).toBe(true);
    expect(kb[0][0].text.length).toBeLessThanOrEqual(22);
  });
});
