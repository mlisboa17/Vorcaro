import { describe, expect, it } from "vitest";
import { FinancialHealthScoreService } from "../application/services/financial-health-score.service";

describe("FinancialHealthScoreService", () => {
  const service = new FinancialHealthScoreService();

  it("classifica score excelente sem penalidades", () => {
    const result = service.compute({
      criticalAlerts: 0,
      warningAlerts: 0,
      commitmentPercent: 40,
      goalsAtRisk: 0,
      overdueReceivableAmount: 0,
      subscriptionDuplicates: [],
      moneyLeaks: [],
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.classification).toBe("EXCELENTE");
  });

  it("penaliza alertas críticos e comprometimento", () => {
    const result = service.compute({
      criticalAlerts: 2,
      warningAlerts: 3,
      commitmentPercent: 85,
      goalsAtRisk: 1,
      overdueReceivableAmount: 500,
      subscriptionDuplicates: [
        {
          brand: "netflix",
          normalizedName: "Netflix",
          duplicateGroup: "netflix",
          suspectedIds: ["1", "2"],
          potentialMonthlySaving: 50,
          occurrences: 2,
          monthlyTotal: 100,
          descriptions: [],
          cardIds: ["c1", "c2"],
          accountIds: ["a1"],
        },
      ],
      moneyLeaks: [
        {
          label: "x",
          monthlyTotal: 150,
          itemCount: 3,
          occurrences: 3,
          trend: "UP",
          suggestedPriority: "MEDIUM",
          itemIds: ["1"],
          monthlyHistory: [30, 60, 94],
        },
      ],    });
    expect(result.score).toBeLessThan(60);
    expect(result.classification).toBe("CRITICA");
  });
});
