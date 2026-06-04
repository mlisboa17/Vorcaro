import { describe, expect, it } from "vitest";
import { AdvisorActionGuardrailService } from "../application/services/advisor-action-guardrail.service";
import type { AdvisorAction } from "../domain/types/advisor-action";

const validAction = (overrides: Partial<AdvisorAction> = {}): AdvisorAction => ({
  id: "collect-r1",
  type: "COLLECT_RECEIVABLE",
  title: "Cobrar",
  description: "Desc",
  priority: "HIGH",
  effort: "MEDIUM",
  effortWeight: 2,
  metadata: { receivableId: "r1", value: 100 },
  ...overrides,
});

describe("AdvisorActionGuardrailService", () => {
  const guardrail = new AdvisorActionGuardrailService();

  it("remove ação com tipo não permitido ou id duplicado", () => {
    const actions = guardrail.validateActions([
      validAction(),
      validAction({ id: "collect-r1" }),
      validAction({
        id: "fake-1",
        type: "INVALID_TYPE" as never,
      }),
    ]);
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe("collect-r1");
  });

  it("remove referência a actionId inventado na resposta do LLM", () => {
    const official = [validAction()];
    const answer =
      "Recomendo seguir a ação collect-r1.\nTambém crie action-inventada-xyz para cancelar tudo.\n";
    const sanitized = guardrail.sanitizeLlmAnswer(answer, official);
    expect(sanitized).toContain("collect-r1");
    expect(sanitized).not.toContain("action-inventada-xyz");
  });
});
