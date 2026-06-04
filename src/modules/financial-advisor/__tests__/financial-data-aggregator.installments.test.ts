import { describe, expect, it, vi } from "vitest";
import { FinancialDataAggregatorService } from "../application/services/financial-data-aggregator.service";
import { InstallmentReadModelService } from "@/modules/installments/application/services/installment-read-model.service";

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
      totalOutflows: 0,
      totalInflows: 0,
      netCommitment: 0,
      commitmentsCount: 0,
      overdueCount: 0,
      next7DaysCount: 0,
      byOrigin: [],
      items: [],
    }),
  }),
}));

vi.mock("@/lib/api/receivable-use-cases", () => ({
  buildReceivableUseCases: () => ({
    getSummary: { execute: vi.fn().mockResolvedValue({ totalPendente: 0 }) },
  }),
}));

describe("FinancialDataAggregatorService — parcelamentos", () => {
  it("injeta sumário de parcelamentos no markdown", async () => {
    vi.spyOn(InstallmentReadModelService.prototype, "getSummary").mockResolvedValue({
      parceladoTotal: 1200,
      valorJaPago: 400,
      valorRestante: 800,
      parcelasRestantes: 8,
      planosAtivos: 2,
      planosConcluidos: 0,
    });
    vi.spyOn(InstallmentReadModelService.prototype, "listGroups").mockResolvedValue([
      {
        installmentGroup: "g1",
        descricao: "TV 55",
        totalParcelas: 10,
        parcelaAtual: 3,
        valorParcela: 100,
        valorTotal: 1000,
        parcelasPagas: 2,
        parcelasRestantes: 8,
        valorPago: 200,
        valorRestante: 800,
        primeiraParcela: "2026-01-01",
        ultimaParcela: "2026-10-01",
        cartao: "Nubank",
        status: "ATIVO",
        parcelamentoEstruturado: true,
      },
    ]);

    const prisma = {
      financialAccount: { findMany: vi.fn().mockResolvedValue([]) },
      card: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      lancamentoRecorrente: { findMany: vi.fn().mockResolvedValue([]) },
      patrimonyAsset: { findMany: vi.fn().mockResolvedValue([]) },
      patrimonyLiability: { findMany: vi.fn().mockResolvedValue([]) },
      consortium: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const aggregator = new FinancialDataAggregatorService(prisma as never);
    const result = await aggregator.aggregate("user-1");

    expect(result.usedSources).toContain("parcelamentos");
    expect(result.markdown).toContain("Ainda devo (valor restante): R$ 800.00");
    expect(result.markdown).toContain("Nubank");
  });
});
