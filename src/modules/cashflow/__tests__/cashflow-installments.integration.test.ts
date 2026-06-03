import { describe, expect, it, vi } from "vitest";
import { CashflowProjectionService } from "../application/services/cashflow-projection.service";
import { InstallmentReadModelService } from "@/modules/installments/application/services/installment-read-model.service";

function daysFromNow(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 12));
}

describe("CashflowProjectionService — INSTALLMENT anti-duplicidade", () => {
  it("não duplica parcela já contada como FATURA", async () => {
    const faturaDate = daysFromNow(20);
    const installmentMock = {
      getFutureCommitments: vi.fn().mockResolvedValue([
        {
          transactionId: "tx-card-1",
          installmentGroup: "grp",
          descricao: "Compra",
          numeroParcela: 2,
          valor: 150,
          data: faturaDate.toISOString().slice(0, 10),
          cartao: "Nubank",
          cardId: "card-1",
        },
      ]),
    } as unknown as InstallmentReadModelService;

    const service = new CashflowProjectionService(
      {
        getActiveAccountsBalance: async () => ["1000.00"],
        getFutureTransactions: async () => [
          {
            id: "tx-card-1",
            type: "EXPENSE",
            amount: "150.00",
            description: "Compra parcelada",
            date: daysFromNow(5),
            dataCaixa: null,
            dataVencimentoFatura: faturaDate,
            cardId: "card-1",
            liabilityId: null,
          },
        ],
        getActiveRecurring: async () => [],
        getActiveLiabilities: async () => [],
        getActiveConsortiums: async () => [],
        getOpenReceivablesUntil: async () => [],
      },
      installmentMock,
    );

    const result = await service.execute("user-1");
    const installmentEvents = result.eventos.filter((e) => e.origem === "INSTALLMENT");
    const faturaEvents = result.eventos.filter((e) => e.origem === "FATURA");

    expect(faturaEvents).toHaveLength(1);
    expect(installmentEvents).toHaveLength(0);
  });

  it("injeta INSTALLMENT quando não há FATURA no mesmo período", async () => {
    const due = daysFromNow(45);
    const installmentMock = {
      getFutureCommitments: vi.fn().mockResolvedValue([
        {
          transactionId: "tx-orphan",
          installmentGroup: "grp2",
          descricao: "Sofá",
          numeroParcela: 3,
          valor: 200,
          data: due.toISOString().slice(0, 10),
          cartao: null,
          cardId: null,
        },
      ]),
    } as unknown as InstallmentReadModelService;

    const service = new CashflowProjectionService(
      {
        getActiveAccountsBalance: async () => ["500.00"],
        getFutureTransactions: async () => [],
        getActiveRecurring: async () => [],
        getActiveLiabilities: async () => [],
        getActiveConsortiums: async () => [],
        getOpenReceivablesUntil: async () => [],
      },
      installmentMock,
    );

    const result = await service.execute("user-1");
    expect(result.eventos.some((e) => e.origem === "INSTALLMENT")).toBe(true);
  });
});
