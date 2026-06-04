import { describe, expect, it } from "vitest";
import { AdvisorLanguageGuardrailService } from "../application/services/advisor-language-guardrail.service";
import { mockAdvisorAction } from "./test-helpers";

describe("AdvisorLanguageGuardrailService", () => {
  const service = new AdvisorLanguageGuardrailService();

  it("anexa métricas objetivas quando resposta do LLM é vaga", () => {
    const actions = [
      mockAdvisorAction({
        objectiveMetric: {
          currentValue: 620,
          comparisonType: "INCOME_PERCENTAGE",
          percentage: 12.4,
          threshold: 10,
          explanation:
            "Comprometimento alto: R$ 620 com delivery neste mês, equivalente a 12,4% da renda prevista.",
        },
      }),
    ];

    const answer = service.enrichAnswerWithObjectiveMetrics(
      "Seu gasto com delivery está muito alto.",
      actions,
    );

    expect(answer).toContain("Dados objetivos");
    expect(answer).toContain("R$ 620");
  });
});
