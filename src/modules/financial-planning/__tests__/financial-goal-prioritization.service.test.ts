import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { FinancialGoalPrioritizationService } from "../application/services/financial-goal-prioritization.service";

describe("FinancialGoalPrioritizationService", () => {
  const service = new FinancialGoalPrioritizationService();
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("prioriza reserva de emergência antes de aposentadoria", () => {
    const emergency = {
      id: "1",
      tipo: "EMERGENCY_FUND" as const,
      prioridade: "MEDIUM" as const,
      dataObjetivo: null,
      status: "ACTIVE" as const,
      createdAt: now,
    };
    const retirement = {
      id: "2",
      tipo: "RETIREMENT" as const,
      prioridade: "HIGH" as const,
      dataObjetivo: null,
      status: "ACTIVE" as const,
      createdAt: now,
    };

    const sorted = service.sort([retirement, emergency]);
    expect(sorted[0]?.id).toBe("1");
  });

  it("prioriza quitação de dívida antes de meta customizada", () => {
    const debt = {
      id: "d",
      tipo: "DEBT_SETTLEMENT" as const,
      prioridade: "MEDIUM" as const,
      dataObjetivo: null,
      status: "ACTIVE" as const,
      createdAt: now,
    };
    const custom = {
      id: "c",
      tipo: "CUSTOM" as const,
      prioridade: "HIGH" as const,
      dataObjetivo: null,
      status: "ACTIVE" as const,
      createdAt: now,
    };

    const sorted = service.sort([custom, debt]);
    expect(sorted[0]?.id).toBe("d");
  });
});
