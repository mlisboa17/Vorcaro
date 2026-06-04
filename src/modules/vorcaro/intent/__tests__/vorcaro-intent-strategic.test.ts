import { describe, expect, it } from "vitest";
import { VorcaroIntentEngineService } from "../application/services/vorcaro-intent-engine.service";

describe("STRATEGIC_ADVICE (Sprint 14.6 — H-01)", () => {
  const engine = new VorcaroIntentEngineService();

  const strategicPhrases = [
    "Como acelerar meu patrimônio?",
    "Como enriquecer mais rápido?",
    "O que você faria para aumentar meu patrimônio?",
    "Como melhorar minha situação financeira?",
    "Como acumular patrimônio mais rapidamente?",
    "O que você faria no meu lugar?",
  ];

  it.each(strategicPhrases)("classifica %j como STRATEGIC_ADVICE com LLM", (phrase) => {
    const result = engine.detect(phrase);
    expect(result.primary).toBe("STRATEGIC_ADVICE");
    expect(result.requiresLlm).toBe(true);
  });
});
