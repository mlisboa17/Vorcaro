import type { AdvisorAction } from "../domain/types/advisor-action";

export function mockAdvisorAction(overrides: Partial<AdvisorAction> = {}): AdvisorAction {
  return {
    id: "collect-r1",
    type: "COLLECT_RECEIVABLE",
    title: "Cobrar recebível",
    description: "Desc",
    priority: "HIGH",
    effort: "MEDIUM",
    effortWeight: 2,
    recommendationHash: "a".repeat(64),
    actionUrl: "/dashboard/receivables",
    estimatedImpact: 100,
    objectiveMetric: {
      currentValue: 100,
      comparisonType: "THRESHOLD",
      explanation: "Recebível pendente de R$ 100,00.",
    },
    metadata: { receivableId: "r1", value: 100 },
    ...overrides,
  };
}
