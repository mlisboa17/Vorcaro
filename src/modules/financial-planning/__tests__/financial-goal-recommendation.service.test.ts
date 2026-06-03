import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { FinancialGoalRecommendationService } from "../application/services/financial-goal-recommendation.service";
import type { CashFlowProjectionDTO } from "@/types/cashflow";

const cashflow: CashFlowProjectionDTO = {
  saldoAtual: 0,
  previsao30Dias: 2300,
  previsao7Dias: 500,
  previsao60Dias: 4000,
  previsao90Dias: 5000,
  previsao180Dias: 6000,
  previsao365Dias: 8000,
  primeiraDataNegativa: null,
  eventos: [],
  alertas: [],
};

describe("FinancialGoalRecommendationService.buildForGoal", () => {
  const service = new FinancialGoalRecommendationService({} as never);

  it("gera recomendação conversacional com explicabilidade", () => {
    const goal = {
      nome: "Apartamento",
      tipo: "REAL_ESTATE" as const,
      valorObjetivo: new Prisma.Decimal("120000"),
      valorAtual: new Prisma.Decimal("20000"),
      aporteMensal: new Prisma.Decimal("1500"),
      status: "ACTIVE" as const,
    };

    const strategy = {
      mesesRestantes: 67,
      dataEstimada: new Date("2031-12-01"),
      aporteNecessarioCents: null,
      percentualConcluido: 17,
      restanteCents: 10_000_000,
    };

    const viability = {
      viavel: true,
      risco: "LOW" as const,
      margemLivreMensal: "2300.00",
      percentualComprometimento: 65,
      statusVisual: "VIAVEL" as const,
      atrasada: false,
    };

    const rec = service.buildForGoal(goal, strategy, viability, {
      cashflow,
      patrimonioLiquido: 286000,
      totalPassivos: 502000,
      margemLivreMensal: "2300.00",
    });

    expect(rec.mensagem).toContain("1500");
    expect(rec.mensagem).toContain("67 meses");
    expect(rec.explicabilidade.some((l) => l.includes("286000"))).toBe(true);
  });

  it("marca meta concluída", () => {
    const rec = service.buildForGoal(
      {
        nome: "Reserva",
        tipo: "EMERGENCY_FUND",
        valorObjetivo: new Prisma.Decimal("10000"),
        valorAtual: new Prisma.Decimal("10000"),
        aporteMensal: null,
        status: "ACHIEVED",
      },
      {
        mesesRestantes: 0,
        dataEstimada: null,
        aporteNecessarioCents: 0,
        percentualConcluido: 100,
        restanteCents: 0,
      },
      {
        viavel: true,
        risco: "LOW",
        margemLivreMensal: "1000.00",
        percentualComprometimento: 0,
        statusVisual: "VIAVEL",
        atrasada: false,
      },
      {
        cashflow,
        patrimonioLiquido: 10000,
        totalPassivos: 0,
        margemLivreMensal: "1000.00",
      },
    );

    expect(rec.titulo).toBe("Meta concluída");
  });
});
