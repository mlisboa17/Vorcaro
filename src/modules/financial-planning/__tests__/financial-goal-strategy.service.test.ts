import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { FinancialGoalStrategyService } from "../application/services/financial-goal-strategy.service";

describe("FinancialGoalStrategyService", () => {
  const service = new FinancialGoalStrategyService();
  const ref = new Date("2026-06-01T12:00:00.000Z");

  it("calcula percentual concluído e meses restantes", () => {
    const result = service.compute(
      {
        valorObjetivo: new Prisma.Decimal("120000.00"),
        valorAtual: new Prisma.Decimal("20000.00"),
        aporteMensal: new Prisma.Decimal("1500.00"),
        dataObjetivo: null,
      },
      ref,
    );

    expect(result.percentualConcluido).toBe(17);
    expect(result.mesesRestantes).toBe(67);
    expect(result.restanteCents).toBe(10_000_000);
  });

  it("calcula aporte necessário por data alvo", () => {
    const result = service.compute(
      {
        valorObjetivo: new Prisma.Decimal("120000.00"),
        valorAtual: new Prisma.Decimal("20000.00"),
        aporteMensal: null,
        dataObjetivo: new Date("2028-12-31T00:00:00.000Z"),
      },
      ref,
    );

    expect(result.aporteNecessarioCents).toBeGreaterThan(0);
  });
});
