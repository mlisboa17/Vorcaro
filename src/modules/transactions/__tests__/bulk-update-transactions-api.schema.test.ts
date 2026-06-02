import { describe, expect, it } from "vitest";
import {
  bulkUpdateTransactionsApiSchema,
  listBulkAuditFields,
} from "../domain/schemas/bulk-update-transactions-api.schema";

describe("bulk update transactions api schema", () => {
  it("aceita payload válido", () => {
    const parsed = bulkUpdateTransactionsApiSchema.safeParse({
      transactionIds: ["tx-1"],
      updates: { categoryId: "cat-1", dataCaixa: "2026-06-10" },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejeita updates vazio", () => {
    const parsed = bulkUpdateTransactionsApiSchema.safeParse({
      transactionIds: ["tx-1"],
      updates: {},
    });

    expect(parsed.success).toBe(false);
  });

  it("mapeia campos de auditoria", () => {
    expect(
      listBulkAuditFields({
        categoryId: "cat-1",
        dataCaixa: "2026-06-10",
      }),
    ).toEqual(["categoria", "dataCaixa"]);
  });
});
