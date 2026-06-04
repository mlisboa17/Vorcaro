import { describe, expect, it } from "vitest";
import { AdvisorObjectiveLanguageService } from "../domain/services/advisor-objective-language.service";
import { mockAdvisorAction } from "./test-helpers";

describe("AdvisorObjectiveLanguageService", () => {
  const service = new AdvisorObjectiveLanguageService();

  it("gera explicação quantificada para delivery acima do limite", () => {
    const metric = service.buildMetric(
      mockAdvisorAction({
        type: "REDUCE_SUPERFLUOUS_EXPENSES",
        metadata: { category: "DELIVERY", currentSpending: 620, targetSpending: 434 },
      }),
      { monthIncome: 5000 },
      {
        spend: {
          key: "DELIVERY",
          label: "Delivery",
          monthlyAmount: 620,
          percentOfIncome: 12.4,
          trend: "UP",
        },
      },
    );

    expect(metric.explanation).toContain("620");
    expect(metric.explanation).toContain("12.4");
    expect(metric.explanation).toContain("10%");
    expect(metric.explanation).not.toMatch(/muito alto/i);
  });
});
