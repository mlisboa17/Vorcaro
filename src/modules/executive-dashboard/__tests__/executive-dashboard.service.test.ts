import { describe, expect, it, vi } from "vitest";
import { ExecutiveDashboardService } from "../application/services/executive-dashboard.service";
describe("ExecutiveDashboardService", () => {
  it("consolida cash, mês, orçamento, patrimônio e alertas", async () => {
    const cashflowProjection = {
      execute: vi.fn().mockResolvedValue({
        saldoAtual: 12000,
        previsao30Dias: 9000,
        previsao90Dias: 7000,
        primeiraDataNegativa: "2026-07-15",
        alertas: [
          {
            tipo: "CAIXA_NEGATIVO",
            mensagem: "Saldo negativo em breve.",
            gravidade: "CRITICAL",
          },
        ],
      }),
    };

    const patrimonyUnitOfWork = {
      getSummary: vi.fn().mockResolvedValue({
        totalAtivos: 500000,
        totalPassivos: 200000,
        patrimonioLiquido: 300000,
        ativosPorTipo: {},
        passivosPorTipo: {},
        evolucaoMensal: [],
      }),
    };

    const budgetOverview = {
      getOverview: vi.fn().mockResolvedValue({
        totalPlanejado: 10000,
        totalRealizadoDre: 8500,
        restante: 1500,
        categoriasEstouradas: 1,
        categoriasAtencao: 2,
        categories: [],
      }),
    };

    const monthOverview = {
      getCurrentMonth: vi.fn().mockResolvedValue({
        receitas: 20000,
        despesasCaixa: 12000,
        despesasDre: 11000,
        saldoMes: 8000,
      }),
    };

    const consortiumService = {
      getExecutiveSummary: vi.fn().mockResolvedValue({
        consorciosAtivos: 2,
        creditoTotalConsorcio: 150000,
        valorPagoConsorcio: 45000,
      }),
      list: vi.fn().mockResolvedValue([]),
    };

    const service = new ExecutiveDashboardService(
      cashflowProjection as never,
      patrimonyUnitOfWork as never,
      budgetOverview,
      monthOverview as never,
      consortiumService as never,
    );

    const result = await service.execute("user-1");

    expect(result.cash.saldoAtual).toBe(12000);
    expect(result.cash.saldoProjetado30Dias).toBe(9000);
    expect(result.cash.saldoProjetado90Dias).toBe(7000);
    expect(result.cash.primeiraDataNegativa).toBe("2026-07-15");
    expect(result.month.saldoMes).toBe(8000);
    expect(result.budget.restante).toBe(1500);
    expect(result.consortium.consorciosAtivos).toBe(2);
    expect(result.patrimony.patrimonioLiquido).toBe(
      result.patrimony.totalAtivos - result.patrimony.totalPassivos,
    );
    expect(result.alerts.some((a) => a.type === "CAIXA_NEGATIVO")).toBe(true);
    expect(result.alerts.some((a) => a.type === "ORCAMENTO_ESTOURADO")).toBe(true);
  });

  it("mantém patrimônio líquido coerente com ativos menos passivos", async () => {
    const service = new ExecutiveDashboardService(
      {
        execute: vi.fn().mockResolvedValue({
          saldoAtual: 0,
          previsao30Dias: 0,
          previsao90Dias: 0,
          primeiraDataNegativa: null,
          alertas: [],
        }),
      } as never,
      {
        getSummary: vi.fn().mockResolvedValue({
          totalAtivos: 150000.5,
          totalPassivos: 45000.25,
          patrimonioLiquido: 105000.25,
          ativosPorTipo: {},
          passivosPorTipo: {},
          evolucaoMensal: [],
        }),
      } as never,
      {
        getOverview: vi.fn().mockResolvedValue({
          totalPlanejado: 0,
          totalRealizadoDre: 0,
          restante: 0,
          categoriasEstouradas: 0,
          categoriasAtencao: 0,
          categories: [],
        }),
      },
      {
        getCurrentMonth: vi.fn().mockResolvedValue({
          receitas: 0,
          despesasCaixa: 0,
          despesasDre: 0,
          saldoMes: 0,
        }),
      } as never,
      {
        getExecutiveSummary: vi.fn().mockResolvedValue({
          consorciosAtivos: 0,
          creditoTotalConsorcio: 0,
          valorPagoConsorcio: 0,
        }),
        list: vi.fn().mockResolvedValue([]),
      } as never,
    );

    const result = await service.execute("user-2");
    expect(result.patrimony.patrimonioLiquido).toBeCloseTo(
      result.patrimony.totalAtivos - result.patrimony.totalPassivos,
      5,
    );
  });
});
