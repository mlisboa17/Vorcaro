import { describe, expect, it } from "vitest";
import { VorcaroToneGuardrailService } from "../application/services/vorcaro-tone-guardrail.service";

describe("VorcaroToneGuardrailService", () => {
  const guardrail = new VorcaroToneGuardrailService();

  it("reduz REALITY_AUDITOR para BALANCED em fluxo negativo iminente", () => {
    const effective = guardrail.resolveEffectiveTone("REALITY_AUDITOR", {
      negativeCashflowDays: 9,
    });
    expect(effective).toBe("BALANCED");
  });

  it("mantém PROFESSIONAL em cenário crítico", () => {
    const effective = guardrail.resolveEffectiveTone("PROFESSIONAL", {
      overdueReceivableAmount: 500,
    });
    expect(effective).toBe("PROFESSIONAL");
  });

  it("não altera tom quando não há risco", () => {
    expect(guardrail.resolveEffectiveTone("IMPACT", {})).toBe("IMPACT");
  });

  it("gera instrução quando tom efetivo difere do preferido", () => {
    const instruction = guardrail.buildGuardrailInstruction("REALITY_AUDITOR", "BALANCED");
    expect(instruction).toContain("clareza");
  });
});
