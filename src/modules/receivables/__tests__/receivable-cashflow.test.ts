import { describe, expect, it, vi } from "vitest";
import { CashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";

describe("CashflowProjectionService — receivables", () => {
  it("inclui receita prevista de contas a receber", async () => {
    const expectedDate = new Date();
    expectedDate.setUTCDate(expectedDate.getUTCDate() + 15);
    expectedDate.setUTCHours(12, 0, 0, 0);

    const service = new CashflowProjectionService({
      getActiveAccountsBalance: vi.fn().mockResolvedValue(["1000.00"]),
      getFutureTransactions: vi.fn().mockResolvedValue([]),
      getActiveRecurring: vi.fn().mockResolvedValue([]),
      getActiveLiabilities: vi.fn().mockResolvedValue([]),
      getActiveConsortiums: vi.fn().mockResolvedValue([]),
      getOpenReceivablesUntil: vi.fn().mockResolvedValue([
        {
          id: "recv-1",
          descricao: "Hotel viagem",
          devedorNome: "Empresa XYZ",
          valorPendente: "2000.00",
          expectedDate,
        },
      ]),
    });

    const projection = await service.execute("user-1");
    const receivableEvent = projection.eventos.find((event) => event.origem === "RECEIVABLE");
    expect(receivableEvent).toBeDefined();
    expect(receivableEvent?.valor).toBe(2000);
    expect(receivableEvent?.descricao).toMatch(/Empresa XYZ/);
  });
});
