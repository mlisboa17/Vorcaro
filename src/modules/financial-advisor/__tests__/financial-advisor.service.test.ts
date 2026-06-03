import { describe, expect, it, vi } from "vitest";
import { FinancialAdvisorService } from "../application/services/financial-advisor.service";
import { FinancialDataAggregatorService } from "../application/services/financial-data-aggregator.service";
import { INSUFFICIENT_DATA_MESSAGE } from "../domain/constants";
import type { AiRouterService } from "@/modules/ai/application/services/ai-router.service";

describe("FinancialAdvisorService", () => {
  it("retorna LOW e mensagem padrão sem dados suficientes", async () => {
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
