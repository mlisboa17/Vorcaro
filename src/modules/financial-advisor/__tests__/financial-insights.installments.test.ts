import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

const consultMock = vi.fn();

vi.mock("@/modules/financial-consultant/application/services/intelligent-advisor.service", () => ({
  IntelligentAdvisorService: vi.fn().mockImplementation(() => ({
    consult: consultMock,
  })),
}));

describe("FinancialInsightsService — consultor 9.5", () => {
  beforeEach(() => {
    consultMock.mockReset();
  });

  it("mapeia riscos e ações para insights", async () => {
    consultMock.mockResolvedValue({
      summary: "Resumo",
      risks: [
        {
          id: "r1",
          title: "Concentração parcelamentos",
          severity: "warning",
          description: "Cartão com 70%",
          source: "PARCELAMENTO_CONCENTRACAO_CARTAO",
        },
      ],
      recommendations: ["Revise parcelamentos"],
      actions: [
        {
          id: "a1",
          type: "REVIEW_INSTALLMENTS",
          title: "Revisar parcelamentos",
          description: "Comprometimento alto",
          priority: "CRITICAL",
          target: "/dashboard/installments",
        },
      ],
      healthScore: { score: 72, classification: "ATENCAO", factors: [] },
      savingsOpportunities: [],
      subscriptionDuplicates: [],
      moneyLeaks: [],
      spendingHealth: [],
      generatedAt: new Date().toISOString(),
    });

    const { FinancialInsightsService } = await import(
      "../application/services/financial-insights.service"
    );
    const service = new FinancialInsightsService({} as PrismaClient);
    const result = await service.generate("user-1");

    expect(result.summary).toBe("Resumo");
    expect(result.actions).toHaveLength(1);
    expect(result.insights.some((i) => i.ruleId === "PARCELAMENTO_CONCENTRACAO_CARTAO")).toBe(
      true,
    );
    expect(result.insights.some((i) => i.ruleId === "REVIEW_INSTALLMENTS")).toBe(true);
  });
});
