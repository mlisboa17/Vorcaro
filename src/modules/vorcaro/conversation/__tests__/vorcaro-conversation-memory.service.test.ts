import { describe, expect, it } from "vitest";
import { VorcaroConversationMemoryService } from "../application/services/vorcaro-conversation-memory.service";

describe("VorcaroConversationMemoryService", () => {
  const memory = new VorcaroConversationMemoryService();

  it("detecta tópico de fluxo de caixa", () => {
    expect(memory.detectTopic("Como está meu fluxo de caixa?")).toBe("cashflow");
  });

  it("mantém tópico em continuação", () => {
    expect(memory.detectTopic("E no próximo mês?", "cashflow")).toBe("cashflow");
  });

  it("identifica continuação", () => {
    expect(memory.isContinuation("E no próximo mês?")).toBe(true);
  });
});
