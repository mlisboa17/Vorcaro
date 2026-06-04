import { describe, expect, it, vi } from "vitest";
import { FinancialDataAggregatorService } from "../application/services/financial-data-aggregator.service";

vi.mock("@/modules/financial-consultant/application/services/intelligent-advisor.service", () => ({
  IntelligentAdvisorService: class {
    consult = vi.fn().mockResolvedValue({
      summary: "ok",
      risks: [],
      recommendations: [],
      actions: [],
      healthScore: { score: 80, classification: "SAUDAVEL", factors: [] },
      savingsOpportunities: [],
      subscriptionDuplicates: [],
      moneyLeaks: [],
      spendingHealth: [],
      generatedAt: new Date().toISOString(),
    });
  },
}));

vi.mock("@/lib/api/monthly-commitments", () => ({
  buildMonthlyCommitmentsUseCases: () => ({
    getMonthly: vi.fn().mockResolvedValue({
      month: "2026-06",
      totalOutflows: 3500,
      totalInflows: 800,
      netCommitment: 2700,
      commitmentsCount: 5,
      overdueCount: 1,
      next7DaysCount: 2,
      byOrigin: [
        { origin: "RECURRENCE", total: 2000, count: 2 },
        { origin: "CREDIT_CARD", total: 1500, count: 1 },
      ],
      items: [],
    }),
  }),
}));

vi.mock("@/lib/api/receivable-use-cases", () => ({
  buildReceivableUseCases: () => ({
    getSummary: { execute: vi.fn().mockResolvedValue({ totalPendente: 0 }) },
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

vi.mock("@/modules/financial-planning/application/services/financial-planning.service", () => ({
  FinancialPlanningService: class {
    getGoals = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock("@/modules/installments/application/services/installment-read-model.service", () => ({
  InstallmentReadModelService: class {
    getSummary = vi.fn().mockResolvedValue({
      parceladoTotal: 0,
      valorJaPago: 0,
      valorRestante: 0,
      parcelasRestantes: 0,
      planosAtivos: 0,
      planosConcluidos: 0,
    });
    listGroups = vi.fn().mockResolvedValue([]);
  },
}));

describe("FinancialDataAggregatorService — compromissos recorrentes", () => {
  it("injeta seção compromissos_recorrentes no markdown", async () => {
    const prisma = {
      financialAccount: { findMany: vi.fn().mockResolvedValue([]) },
      card: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      lancamentoRecorrente: { findMany: vi.fn().mockResolvedValue([]) },
      patrimonyAsset: { findMany: vi.fn().mockResolvedValue([]) },
      patrimonyLiability: { findMany: vi.fn().mockResolvedValue([]) },
      consortium: { findMany: vi.fn().mockResolvedValue([]) },
    } as never;

    const service = new FinancialDataAggregatorService(prisma);
    const result = await service.aggregate("user-1");

    expect(result.usedSources).toContain("compromissos_recorrentes");
    expect(result.markdown).toContain("## Compromissos do mês");
    expect(result.markdown).toContain("R$ 3500.00");
    expect(result.markdown).toContain("RECURRENCE");
  });
});
