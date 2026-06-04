import { describe, expect, it } from "vitest";
import { VorcaroChatGuardrailService } from "../application/services/vorcaro-chat-guardrail.service";

describe("VorcaroChatGuardrailService", () => {
  const guardrail = new VorcaroChatGuardrailService();

  it("bloqueia quando não há dados suficientes", () => {
    expect(guardrail.shouldBlockInsufficientData(1, [])).toBe(true);
  });

  it("mensagem padrão de dados insuficientes", () => {
    expect(guardrail.insufficientDataMessage).toContain("dados suficientes");
  });
});
