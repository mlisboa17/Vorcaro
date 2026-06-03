import { describe, expect, it, vi } from "vitest";
import { BatchConfirmInboxItemsUseCase } from "../application/use-cases/batch-confirm-inbox-items.use-case";
import { ConfirmTransactionError } from "../application/errors/confirm-transaction.error";
import type { ConfirmAndCreateTransactionUseCase } from "../application/use-cases/confirm-and-create-transaction.use-case";

describe("BatchConfirmInboxItemsUseCase", () => {
  it("confirma ids com sucesso e registra falhas", async () => {
    const confirm = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({ inboxItemId: "ok-1", status: "SAVED" })
        .mockRejectedValueOnce(
          new ConfirmTransactionError("categoryId is required", "VALIDATION"),
        )
        .mockRejectedValueOnce(
          new ConfirmTransactionError("already saved", "INVALID_STATE"),
        ),
    } as unknown as ConfirmAndCreateTransactionUseCase;

    const useCase = new BatchConfirmInboxItemsUseCase(confirm);
    const result = await useCase.execute({
      userId: "user-1",
      inboxItemIds: ["ok-1", "bad-1", "skip-1"],
    });

    expect(result.confirmed).toEqual(["ok-1"]);
    expect(result.failed).toEqual([
      { id: "bad-1", reason: "categoryId is required" },
    ]);
    expect(result.skipped).toEqual(["skip-1"]);
    expect(confirm.execute).toHaveBeenCalledTimes(3);
  });
});
