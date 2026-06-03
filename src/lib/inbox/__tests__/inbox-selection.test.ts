import { describe, expect, it } from "vitest";
import {
  getSelectionCounterText,
  getSelectedIdsArray,
  invertVisibleSelection,
  selectFirstNVisible,
  selectRangeInOrder,
  setSelectionForIds,
  toggleSelectionId,
} from "../inbox-selection";
import {
  EMPTY_INBOX_REVIEW_FILTERS,
  filterInboxItemsForReview,
  getInboxGroupKey,
  groupInboxItems,
} from "../inbox-review-filters";
import type { InboxItem } from "@/types/inbox";

function item(partial: Partial<InboxItem> & Pick<InboxItem, "id" | "rawContent">): InboxItem {
  return {
    userId: "u1",
    status: "NEEDS_CONFIRMATION",
    channel: "WEB_IMPORT",
    channelMeta: null,
    metadata: null,
    errorMessage: null,
    processedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("inbox-selection", () => {
  it("seleciona e desmarca item individual", () => {
    let selected = new Set<string>();
    selected = toggleSelectionId(selected, "a");
    expect(selected.has("a")).toBe(true);
    selected = toggleSelectionId(selected, "a");
    expect(selected.has("a")).toBe(false);
  });

  it("seleciona intervalo com Shift entre âncora e alvo", () => {
    const ordered = ["1", "2", "3", "4", "5"];
    const selected = selectRangeInOrder(ordered, "2", "5", new Set());
    expect([...selected]).toEqual(["2", "3", "4", "5"]);
  });

  it("seleciona grupo de ids", () => {
    const selected = setSelectionForIds(new Set(["x"]), ["a", "b"], true);
    expect([...selected].sort()).toEqual(["a", "b", "x"]);
  });

  it("seleciona primeiros X visíveis", () => {
    const visible = ["a", "b", "c", "d"];
    const selected = selectFirstNVisible(new Set(), visible, 3);
    expect([...selected]).toEqual(["a", "b", "c"]);
  });

  it("inverte seleção visível", () => {
    const visible = ["a", "b", "c"];
    const selected = invertVisibleSelection(new Set(["a", "c", "z"]), visible);
    expect([...selected].sort()).toEqual(["b", "z"]);
  });

  it("limpa seleção ao desmarcar todos", () => {
    const selected = setSelectionForIds(new Set(["a", "b"]), ["a", "b"], false);
    expect(selected.size).toBe(0);
  });

  it("contador com total maior que visível", () => {
    expect(
      getSelectionCounterText({
        selectedCount: 3,
        visibleSelectableCount: 27,
        totalSelectableCount: 120,
      }),
    ).toBe("3 selecionados de 27 visíveis (120 total)");
  });

  it("ação recebe somente IDs selecionados", () => {
    const selected = new Set(["id-1", "id-2"]);
    expect(getSelectedIdsArray(selected)).toEqual(["id-1", "id-2"]);
  });
});

describe("inbox-review-filters", () => {
  const items = [
    item({ id: "1", rawContent: "OUTBACK GRILL 120,00", channel: "WEB_IMPORT" }),
    item({ id: "2", rawContent: "IFOOD *PEDIDO", channel: "TELEGRAM" }),
    item({ id: "3", rawContent: "OUTBACK segunda compra", channel: "WEB_IMPORT" }),
  ];

  it("filtra por termo de busca", () => {
    const filtered = filterInboxItemsForReview(items, {
      ...EMPTY_INBOX_REVIEW_FILTERS,
      search: "outback",
    });
    expect(filtered.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("agrupa por descrição normalizada", () => {
    const groups = groupInboxItems(items);
    const outbackCount = groups
      .filter((g) => g.key.toLowerCase().includes("outback"))
      .reduce((sum, g) => sum + g.items.length, 0);
    expect(outbackCount).toBe(2);
  });

  it("gera chave de grupo estável", () => {
    expect(getInboxGroupKey(item({ id: "x", rawContent: "FortlevEnergia 02/12" }))).toBe(
      "FortlevEnergia",
    );
  });

  it("seleciona grupo — todos os ids do grupo", () => {
    const groupIds = ["1", "3"];
    const selected = setSelectionForIds(new Set(), groupIds, true);
    expect([...selected].sort()).toEqual(["1", "3"]);
  });
});
