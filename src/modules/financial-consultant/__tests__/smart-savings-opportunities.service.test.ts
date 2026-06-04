import { describe, expect, it } from "vitest";
import { SmartSavingsOpportunitiesService } from "../application/services/smart-savings-opportunities.service";
import type { AdvisorAction } from "../domain/types/advisor-action";

describe("SmartSavingsOpportunitiesService", () => {
  const service = new SmartSavingsOpportunitiesService();

  it("ordena Top 3 por maior impacto ajustado por esforço (priorityScore)", () => {
    const actions: AdvisorAction[] = [
      {
        id: "collect-r1",
        type: "COLLECT_RECEIVABLE",
        title: "Cobrar",
        description: "D",
        priority: "HIGH",
        effort: "MEDIUM",
        effortWeight: 2,
        estimatedImpact: 200,
        metadata: { receivableId: "r1", value: 200 },
      },
      {
        id: "dup-netflix",
        type: "REVIEW_SUBSCRIPTIONS",
        title: "Assinatura",
        description: "D",
        priority: "HIGH",
        effort: "LOW",
        effortWeight: 1,
        estimatedImpact: 90,
        metadata: {
          duplicateGroup: "netflix",
          suspectedIds: ["1", "2"],
          potentialMonthlySaving: 90,
          normalizedName: "Netflix",
        },
      },
    ];

    const top = service.build(
      actions,
      [
        {
          brand: "netflix",
          normalizedName: "Netflix",
          duplicateGroup: "netflix",
          suspectedIds: ["1", "2"],
          potentialMonthlySaving: 90,
          occurrences: 2,
          monthlyTotal: 100,
          descriptions: ["A", "B"],
          cardIds: ["c1", "c2"],
          accountIds: ["a1"],
        },
      ],
      [],
      [],
    );

    expect(top[0].priorityScore).toBeGreaterThanOrEqual(top[1]?.priorityScore ?? 0);
    expect(top[0].title).toMatch(/duplicada|Cobrar/i);
    expect(top.every((t) => t.priorityScore > 0)).toBe(true);
  });
});
