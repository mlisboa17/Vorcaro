import { describe, expect, it, vi } from "vitest";
import { FinancialAdvisorService } from "../application/services/financial-advisor.service";
import { FinancialDataAggregatorService } from "../application/services/financial-data-aggregator.service";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { INSUFFICIENT_DATA_MESSAGE } from "../domain/constants";
import type { AiRouterService } from "@/modules/ai/application/services/ai-router.service";

vi.mock("@/modules/vorcaro/application/services/vorcaro-messaging.service", () => ({
  VorcaroMessagingService: vi.fn().mockImplementation(() => ({
    inferCategoryFromCriticalContext: vi.fn().mockReturnValue("GENERAL"),
    buildLlmPromptContext: vi.fn().mockResolvedValue({
      preferredTone: "PROFESSIONAL",
      effectiveTone: "PROFESSIONAL",
      category: "GENERAL",
      system: "Vorcaro system prompt",
    }),
  })),
}));

const mockConsultation = {
  summary: "Resumo consultor",
  risks: [],
  recommendations: [],
  actions: [
    {
      id: "a1",
      type: "REDUCE_EXPENSES" as const,
      title: "Reduzir despesas",
      description: "Fluxo negativo",
      priority: "CRITICAL" as const,
      effort: "HIGH" as const,
      effortWeight: 3 as const,
      recommendationHash: "c".repeat(64),
      actionUrl: "/dashboard/cashflow",
      target: "/dashboard/cashflow",
      estimatedImpact: 0,
      objectiveMetric: {
        currentValue: 0,
        comparisonType: "THRESHOLD" as const,
        explanation: "Fluxo de caixa negativo detectado.",
      },
      metadata: { category: "GERAL", currentSpending: 0, targetSpending: 0 },
    },
  ],
  healthScore: { score: 75, classification: "SAUDAVEL" as const, factors: [] },
  savingsOpportunities: [],
  subscriptionDuplicates: [],
  moneyLeaks: [],
  spendingHealth: [],
  generatedAt: new Date().toISOString(),
};

describe("FinancialAdvisorService", () => {
  it("retorna LOW e mensagem padrão sem dados suficientes", async () => {
    vi.spyOn(IntelligentAdvisorService.prototype, "consult").mockResolvedValue(mockConsultation);
    vi.spyOn(FinancialDataAggregatorService.prototype, "aggregate").mockResolvedValue({
      markdown: "# vazio",
      usedSources: [],
      dataScore: 0,
    });

    const aiRouter = {
      generateText: vi.fn(),
    } as unknown as AiRouterService;

    const service = new FinancialAdvisorService({} as never, aiRouter);
    const result = await service.ask("user-1", "Qual meu saldo?");

    expect(result.confidence).toBe("LOW");
    expect(result.answer).toBe(INSUFFICIENT_DATA_MESSAGE);
    expect(aiRouter.generateText).not.toHaveBeenCalled();
  });

  it("chama IA quando há contexto suficiente", async () => {
    vi.spyOn(IntelligentAdvisorService.prototype, "consult").mockResolvedValue(mockConsultation);
    vi.spyOn(FinancialDataAggregatorService.prototype, "aggregate").mockResolvedValue({
      markdown: "## contas\n- conta 1",
      usedSources: ["contas", "transacoes", "recorrencias"],
      dataScore: 8,
    });

    const aiRouter = {
      generateText: vi.fn().mockResolvedValue({
        provider: "groq",
        model: "llama",
        text: "Resposta baseada em dados.",
      }),
    } as unknown as AiRouterService;

    const service = new FinancialAdvisorService({} as never, aiRouter);
    const result = await service.ask("user-1", "Resumo?");

    expect(result.confidence).toBe("HIGH");
    expect(result.answer).toContain("Resposta");
    expect(aiRouter.generateText).toHaveBeenCalledOnce();
  });
});
