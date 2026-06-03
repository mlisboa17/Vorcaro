import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { handleInboxBulkApplySuggestions } from "../handle-inbox-bulk-apply-suggestions";

vi.mock("@/lib/inbox/handle-inbox-bulk-update", () => ({
  handleInboxBulkUpdate: vi.fn().mockResolvedValue({ updated: 1 }),
}));

vi.mock(
  "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository",
  () => ({
    PrismaExtractionResultRepository: class {
      findLatestByInboxItemId = vi.fn().mockResolvedValue({
        extractedData: {
          inboxClassification: {
            categoryId: "cat-rest",
            categoriaPrincipal: "Alimentação",
            subcategoria: "Restaurantes",
            categoryName: "Alimentação → Restaurantes",
            confidence: 96,
            source: "history",
            explanation: "teste",
            readyToConfirm: true,
            accountId: null,
            cardId: null,
            paymentMethodId: null,
            expenseType: "EXPENSE",
          },
        },
      });
    },
  }),
);

describe("handleInboxBulkApplySuggestions", () => {
  it("aplica categoria sugerida apenas para itens do usuário", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        id: "inbox-1",
        rawContent: "OUTBACK",
        status: "READY",
        userId: "user-1",
      })
      .mockResolvedValueOnce(null);

    const db = {
      financialInbox: { findFirst },
    } as unknown as PrismaClient;

    const result = await handleInboxBulkApplySuggestions(db, "user-1", ["inbox-1", "inbox-2"]);

    expect(result.applied).toBe(1);
    expect(result.failed).toBe(1);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });

  it("ignora itens já efetivados", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "inbox-saved",
      rawContent: "OUTBACK",
      status: "SAVED",
      userId: "user-1",
    });

    const db = {
      financialInbox: { findFirst },
    } as unknown as PrismaClient;

    const result = await handleInboxBulkApplySuggestions(db, "user-1", ["inbox-saved"]);

    expect(result.skipped).toBe(1);
    expect(result.applied).toBe(0);
  });
});
