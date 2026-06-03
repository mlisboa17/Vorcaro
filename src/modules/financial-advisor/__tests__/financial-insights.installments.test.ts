import { describe, expect, it, vi, beforeEach } from "vitest";
import { InstallmentReadModelService } from "@/modules/installments/application/services/installment-read-model.service";

vi.mock("@/modules/cashflow/application/services/cashflow-projection.service", () => ({
  buildCashflowProjectionService: () => ({
    execute: vi.fn().mockResolvedValue({
      previsao30Dias: 1000,
      alertas: [],
    }),
  }),
}));

vi.mock("@/modules/executive-dashboard/application/services/month-financial-overview.service", () => ({
  MonthFinancialOverviewService: vi.fn().mockImplementation(() => ({
    getCurrentMonth: vi.fn().mockResolvedValue({
      receitas: 5000,
      despesasCaixa: 0,
      despesasDre: 0,
      saldoMes: 5000,
    }),
  })),
}));

vi.mock("@/modules/ai/application/services/ai-router.service", () => ({
  AiRouterService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn().mockResolvedValue({ text: "ok", provider: "groq", model: "m" }),
  })),
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

describe("FinancialInsightsService — parcelamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispara insight de concentração por cartão >= 60%", async () => {
    vi.spyOn(InstallmentReadModelService.prototype, "getSummary").mockResolvedValue({
      parceladoTotal: 1000,
      valorJaPago: 0,
      valorRestante: 1000,
      parcelasRestantes: 5,
      planosAtivos: 2,
      planosConcluidos: 0,
    });
    vi.spyOn(InstallmentReadModelService.prototype, "listGroups").mockResolvedValue([
      {
        installmentGroup: "a",
        descricao: "A",
        totalParcelas: 5,
        parcelaAtual: 1,
        valorParcela: 100,
        valorTotal: 700,
        parcelasPagas: 0,
        parcelasRestantes: 5,
        valorPago: 0,
        valorRestante: 700,
        primeiraParcela: "2026-01-01",
        ultimaParcela: "2026-05-01",
        cartao: "Cartão A",
        status: "ATIVO",
        parcelamentoEstruturado: true,
      },
      {
        installmentGroup: "b",
        descricao: "B",
        totalParcelas: 3,
        parcelaAtual: 1,
        valorParcela: 100,
        valorTotal: 300,
        parcelasPagas: 0,
        parcelasRestantes: 3,
        valorPago: 0,
        valorRestante: 300,
        primeiraParcela: "2026-01-01",
        ultimaParcela: "2026-03-01",
        cartao: "Cartão B",
        status: "ATIVO",
        parcelamentoEstruturado: true,
      },
    ]);
    vi.spyOn(InstallmentReadModelService.prototype, "getFutureCommitments").mockResolvedValue([]);

    const prisma = {
      patrimonyLiability: { findMany: vi.fn().mockResolvedValue([]) },
      patrimonyAsset: { findMany: vi.fn().mockResolvedValue([]) },
      consortium: { findMany: vi.fn().mockResolvedValue([]) },
      financialAccount: { findMany: vi.fn().mockResolvedValue([]) },
      card: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      lancamentoRecorrente: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const { FinancialInsightsService } = await import(
      "../application/services/financial-insights.service"
    );
    const service = new FinancialInsightsService(prisma as never);
    const { insights } = await service.generate("user-1");
    expect(insights.some((i) => i.ruleId === "PARCELAMENTO_CONCENTRACAO_CARTAO")).toBe(true);
  });

  it("dispara insight de fim de ciclo com 1 parcela restante", async () => {
    vi.spyOn(InstallmentReadModelService.prototype, "getSummary").mockResolvedValue({
      parceladoTotal: 200,
      valorJaPago: 100,
      valorRestante: 100,
      parcelasRestantes: 1,
      planosAtivos: 1,
      planosConcluidos: 0,
    });
    vi.spyOn(InstallmentReadModelService.prototype, "listGroups").mockResolvedValue([
      {
        installmentGroup: "last",
        descricao: "Notebook",
        totalParcelas: 2,
        parcelaAtual: 2,
        valorParcela: 100,
        valorTotal: 200,
        parcelasPagas: 1,
        parcelasRestantes: 1,
        valorPago: 100,
        valorRestante: 100,
        primeiraParcela: "2026-01-01",
        ultimaParcela: "2026-02-01",
        status: "ATIVO",
        parcelamentoEstruturado: true,
      },
    ]);
    vi.spyOn(InstallmentReadModelService.prototype, "getFutureCommitments").mockResolvedValue([]);

    const prisma = {
      patrimonyLiability: { findMany: vi.fn().mockResolvedValue([]) },
      patrimonyAsset: { findMany: vi.fn().mockResolvedValue([]) },
      consortium: { findMany: vi.fn().mockResolvedValue([]) },
      financialAccount: { findMany: vi.fn().mockResolvedValue([]) },
      card: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      lancamentoRecorrente: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const { FinancialInsightsService } = await import(
      "../application/services/financial-insights.service"
    );
    const service = new FinancialInsightsService(prisma as never);
    const { insights } = await service.generate("user-1");
    expect(insights.some((i) => i.ruleId === "PARCELAMENTO_FIM_CICLO")).toBe(true);
  });
});
