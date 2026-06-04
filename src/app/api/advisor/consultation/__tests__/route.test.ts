import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const consultMock = vi.fn();

vi.mock("@/lib/api/financial-advisor", () => ({
  buildIntelligentAdvisorService: () => ({
    consult: consultMock,
  }),
}));

describe("GET /api/advisor/consultation", () => {
  beforeEach(() => {
    consultMock.mockReset();
    consultMock.mockResolvedValue({
      summary: "Resumo teste",
      risks: [],
      recommendations: [],
      actions: [
        {
          id: "collect-r1",
          type: "COLLECT_RECEIVABLE",
          title: "Cobrar",
          description: "Desc",
          priority: "HIGH",
          effort: "MEDIUM",
          effortWeight: 2,
          recommendationHash: "d".repeat(64),
          actionUrl: "/dashboard/receivables",
          target: "/dashboard/receivables",
          estimatedImpact: 100,
          objectiveMetric: {
            currentValue: 100,
            comparisonType: "THRESHOLD",
            explanation: "Recebível pendente.",
          },
          metadata: { receivableId: "r1", value: 100 },
        },
      ],
      healthScore: { score: 80, classification: "SAUDAVEL", factors: [] },
      savingsOpportunities: [],
      subscriptionDuplicates: [],
      moneyLeaks: [],
      spendingHealth: [],
      generatedAt: new Date().toISOString(),
    });
  });

  it("retorna consultoria estruturada", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.summary).toBe("Resumo teste");
    expect(body.actions).toHaveLength(1);
    expect(body.healthScore.score).toBe(80);
  });
});
