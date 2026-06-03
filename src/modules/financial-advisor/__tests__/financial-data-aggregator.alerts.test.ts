import { describe, expect, it, vi } from "vitest";
import { FinancialDataAggregatorService } from "../application/services/financial-data-aggregator.service";

const summaryMock = vi.fn();
const listMock = vi.fn();

vi.mock("@/modules/financial-alerts/application/services/financial-alert-query.service", () => ({
  FinancialAlertQueryService: vi.fn().mockImplementation(() => ({
    summary: summaryMock,
    list: listMock,
  })),
}));

vi.mock("@/lib/api/monthly-commitments", () => ({
  buildMonthlyCommitmentsUseCases: () => ({
    getMonthly: vi.fn().mockResolvedValue({ commitmentsCount: 0 }),
  }),
}));

vi.mock("@/lib/api/receivable-use-cases", () => ({
  buildReceivableUseCases: () => ({
    getSummary: { execute: vi.fn().mockResolvedValue({ totalPendente: 0 }) },
    list: { execute: vi.fn().mockResolvedValue([]) },
  }),
}));

vi.mock("@/modules/cashflow/application/services/cashflow-projection.service", () => ({
  buildCashflowProjectionService: () => ({
    execute: vi.fn().mockResolvedValue({
      saldoAtual: 0,
      previsao30Dias: 0,
      eventos: [],
      alertas: [],
    }),
  }),
}));

function minimalPrisma() {
  return {
    financialAccount: { findMany: vi.fn().mockResolvedValue([]) },
    card: { findMany: vi.fn().mockResolvedValue([]) },
    category: { findMany: vi.fn().mockResolvedValue([]) },
    transaction: { findMany: vi.fn().mockResolvedValue([]) },
    lancamentoRecorrente: { findMany: vi.fn().mockResolvedValue([]) },
    patrimonyAsset: { findMany: vi.fn().mockResolvedValue([]) },
    patrimonyLiability: { findMany: vi.fn().mockResolvedValue([]) },
    consortium: { findMany: vi.fn().mockResolvedValue([]) },
    financialGoal: { findMany: vi.fn().mockResolvedValue([]) },
  } as never;
}

describe("FinancialDataAggregatorService alertas_financeiros", () => {
  it("injeta seção quando há alertas abertos", async () => {
    summaryMock.mockResolvedValue({
      totalOpen: 2,
      totalCritical: 1,
      totalResolved: 0,
      bySeverity: { INFO: 0, WARNING: 1, CRITICAL: 1 },
      byType: { CASHFLOW_WARNING: 1, GOAL_AT_RISK: 1 },
    });
    listMock.mockResolvedValue({
      items: [
        {
          id: "a1",
          severity: "CRITICAL",
          type: "CASHFLOW_WARNING",
          title: "Caixa",
          description: "Negativo",
        },
        {
          id: "a2",
          severity: "WARNING",
          type: "OVERDUE_RECEIVABLE",
          title: "Recebível",
          description: "Atrasado",
        },
      ],
      total: 2,
      page: 1,
      pageSize: 15,
    });

    const svc = new FinancialDataAggregatorService(minimalPrisma());
    const result = await svc.aggregate("u1");

    expect(result.usedSources).toContain("alertas_financeiros");
    expect(result.markdown).toContain("## Alertas financeiros");
    expect(result.markdown).toContain("Reduza gastos variáveis");
    expect(result.markdown).toContain("Antecipe recebíveis");
  });
});
