import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { FinancialGoalProjectionService } from "../application/services/financial-goal-projection.service";
import type { CashFlowProjectionDTO } from "@/types/cashflow";

const baseCashflow: CashFlowProjectionDTO = {
  saldoAtual: 5000,
  previsao7Dias: 5200,
  previsao30Dias: 8000,
  previsao60Dias: 9000,
  previsao90Dias: 10000,
  previsao180Dias: 11000,
  previsao365Dias: 12000,
  primeiraDataNegativa: null,
  eventos: [],
  alertas: [],
};

describe("FinancialGoalProjectionService", () => {
  const service = new FinancialGoalProjectionService();
  const ref = new Date("2026-06-01T12:00:00.000Z");

  it("calcula meses e data estimada pelo aporte mensal (cenário A)", () => {
    const result = service.project(
      {
        valorObjetivo: new Prisma.Decimal("10000.00"),
        valorAtual: new Prisma.Decimal("2000.00"),
        aporteMensal: new Prisma.Decimal("1000.00"),
        dataObjetivo: null,
      },
      baseCashflow,
      ref,
    );

    expect(result.mesesRestantes).toBe(8);
    expect(result.dataEstimada?.toISOString().slice(0, 10)).toBe("2027-02-01");
    expect(result.aporteNecessarioCents).toBeNull();
  });

  it("calcula aporte necessário pela data objetivo (cenário B)", () => {
    const result = service.project(
      {
        valorObjetivo: new Prisma.Decimal("6000.00"),
        valorAtual: new Prisma.Decimal("0.00"),
        aporteMensal: null,
        dataObjetivo: new Date("2026-12-01T00:00:00.000Z"),
      },
      baseCashflow,
      ref,
    );

    expect(result.mesesRestantes).toBe(6);
    expect(result.aporteNecessarioCents).toBe(100_000);
  });

  it("marca RISCO_ALTO quando margem mensal é menor que aporte planejado", () => {
    const tightCashflow: CashFlowProjectionDTO = {
      ...baseCashflow,
      saldoAtual: 5000,
      previsao30Dias: 5100,
    };

    const result = service.project(
      {
        valorObjetivo: new Prisma.Decimal("12000.00"),
        valorAtual: new Prisma.Decimal("0.00"),
        aporteMensal: new Prisma.Decimal("2000.00"),
        dataObjetivo: null,
      },
      tightCashflow,
      ref,
    );

    expect(result.viabilidade.fluxoInsuficiente).toBe(true);
    expect(result.viabilidade.viavel).toBe(false);
    expect(result.viabilidade.risco).toBe("HIGH");
    expect(result.viabilidade.statusVisual).toBe("RISCO_ALTO");
  });

  it("marca ATENCAO quando comprometimento supera 80% da margem", () => {
    const cashflow: CashFlowProjectionDTO = {
      ...baseCashflow,
      saldoAtual: 0,
      previsao30Dias: 1000,
    };

    const result = service.project(
      {
        valorObjetivo: new Prisma.Decimal("12000.00"),
        valorAtual: new Prisma.Decimal("0.00"),
        aporteMensal: new Prisma.Decimal("900.00"),
        dataObjetivo: null,
      },
      cashflow,
      ref,
    );

    expect(result.viabilidade.viavel).toBe(true);
    expect(result.viabilidade.risco).toBe("MEDIUM");
    expect(result.viabilidade.statusVisual).toBe("ATENCAO");
  });

  it("marca ATRASADA quando data objetivo já passou", () => {
    const result = service.project(
      {
        valorObjetivo: new Prisma.Decimal("5000.00"),
        valorAtual: new Prisma.Decimal("1000.00"),
        aporteMensal: null,
        dataObjetivo: new Date("2026-03-01T00:00:00.000Z"),
      },
      baseCashflow,
      ref,
    );

    expect(result.viabilidade.statusVisual).toBe("ATRASADA");
    expect(result.viabilidade.atrasada).toBe(true);
  });
});
