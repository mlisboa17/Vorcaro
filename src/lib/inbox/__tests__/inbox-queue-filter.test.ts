import { describe, expect, it } from "vitest";
import {
  buildBulkConfirmSummary,
  countPendingInboxItems,
  matchesInboxQueue,
  parseInboxQueueFilter,
} from "../inbox-queue-filter";
import type { InboxItem } from "@/types/inbox";

function item(status: InboxItem["status"], id = "1"): InboxItem {
  return {
    id,
    userId: "u",
    status,
    channel: "WEB_IMPORT",
    rawContent: "test",
    channelMeta: null,
    metadata: null,
    errorMessage: null,
    processedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("inbox-queue-filter", () => {
  it("default fila é Pendentes", () => {
    expect(parseInboxQueueFilter(null)).toBe("PENDENTES");
  });

  it("conta pendentes corretamente", () => {
    const items = [
      item("NEEDS_CONFIRMATION", "1"),
      item("SAVED", "2"),
      item("PROCESSING", "3"),
    ];
    expect(countPendingInboxItems(items)).toBe(2);
  });

  it("filtra efetivados e ignorados", () => {
    expect(matchesInboxQueue(item("SAVED"), "EFETIVADOS")).toBe(true);
    expect(matchesInboxQueue(item("ERROR"), "IGNORADOS")).toBe(true);
    expect(matchesInboxQueue(item("NEEDS_CONFIRMATION"), "PENDENTES")).toBe(true);
  });

  it("monta resumo de efetivação em lote", () => {
    expect(
      buildBulkConfirmSummary({ confirmed: 10, skipped: 2, failed: 1, failedItems: [] }),
    ).toEqual({
      confirmed: 10,
      needsReview: 2,
      failed: 1,
      failedItems: [],
    });
  });
});
