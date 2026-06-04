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

vi.mock("@/lib/api/receivable-use-cases", () => ({
  buildReceivableUseCases: () => ({
    getSummary: {
      execute: vi.fn().mockResolvedValue({
        totalOriginal: 8500,
        totalRecebido: 0,
        totalPendente: 8500,
        totalVencido: 2000,
        countOpen: 3,
        countPartial: 0,
        countReceived: 0,
        countCancelled: 0,
        byDebtor: [
          { devedorNome: "João", valorPendente: 2000 },
          { devedorNome: "Empresa XYZ", valorPendente: 4500 },
          { devedorNome: "Maria", valorPendente: 2000 },
        ],
      }),
    },
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
    getSummary = vi.fn().mockResolvedValue({ parceladoTotal: 0, valorJaPago: 0, valorRestante: 0, parcelasRestantes: 0, planosAtivos: 0, planosConcluidos: 0 });
    listGroups = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock("@/lib/api/monthly-commitments", () => ({
  buildMonthlyCommitmentsUseCases: () => ({
    getMonthly: vi.fn().mockResolvedValue({ commitmentsCount: 0 }),
  }),
}));

vi.mock("@/modules/financial-alerts/application/services/financial-alert-query.service", () => ({
  FinancialAlertQueryService: vi.fn().mockImplementation(() => ({
    summary: vi.fn().mockResolvedValue({
      totalOpen: 0,
      totalResolved: 0,
      totalCritical: 0,
      bySeverity: { INFO: 0, WARNING: 0, CRITICAL: 0 },
      byType: {},
    }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 }),
  })),
}));

describe("FinancialDataAggregatorService — contas a receber", () => {
  it("injeta seção de contas a receber no markdown", async () => {
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

    expect(result.usedSources).toContain("contas_a_receber");
    expect(result.markdown).toContain("## Contas a receber");
    expect(result.markdown).toContain("R$ 8500.00");
    expect(result.markdown).toContain("João");
    expect(result.markdown).toContain("Empresa XYZ");
  });
});
