import { describe, expect, it } from "vitest";
import { VorcaroPromptBuilderService } from "../application/services/vorcaro-prompt-builder.service";

describe("VorcaroPromptBuilderService", () => {
  const builder = new VorcaroPromptBuilderService();

  it("monta prompt com histórico e contexto", () => {
    const built = builder.build({
      aggregated: {
        markdown: "# Contexto",
        usedSources: ["contas"],
        dataScore: 8,
        summary: "Resumo",
        healthScore: 75,
        healthClassification: "SAUDAVEL",
        criticalAlertCount: 0,
        generatedAt: new Date().toISOString(),
      },
      historyBlock: "Usuário: Olá",
      activeTopic: "cashflow",
      userMessage: "E no próximo mês?",
    });

    expect(built.contextMarkdown).toContain("Tópico ativo");
    expect(built.contextMarkdown).toContain("# Contexto");
  });
});
