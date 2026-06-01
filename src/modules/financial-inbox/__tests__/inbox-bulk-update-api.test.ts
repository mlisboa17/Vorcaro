import { describe, expect, it } from "vitest";
import {
  mapBulkUpdatePatchToPendingCorrections,
  mapPendingCorrectionsToBulkUpdatePatch,
} from "../domain/schemas/inbox-bulk-update-api.schema";

describe("inbox bulk update api schema", () => {
  it("mapeia patch PT para pending corrections internas", () => {
    const mapped = mapBulkUpdatePatchToPendingCorrections({
      dataCompra: "2026-05-01",
      dataCaixa: "2026-05-10",
      dataVencimentoFatura: "2026-06-01",
      categoriaId: "cat-1",
      contaFinanceiraId: "acc-1",
      formaPagamentoId: "pm-1",
      cartaoId: "card-1",
    });

    expect(mapped).toEqual({
      dataCompra: "2026-05-01",
      dataCaixa: "2026-05-10",
      dataVencimentoFatura: "2026-06-01",
      categoryId: "cat-1",
      accountId: "acc-1",
      paymentMethodId: "pm-1",
      cardId: "card-1",
    });
  });

  it("mapeia pending corrections internas para patch PT", () => {
    const mapped = mapPendingCorrectionsToBulkUpdatePatch({
      categoryId: "cat-2",
      accountId: "acc-2",
      cardId: null,
    });

    expect(mapped).toEqual({
      categoriaId: "cat-2",
      contaFinanceiraId: "acc-2",
      cartaoId: null,
    });
  });
});
