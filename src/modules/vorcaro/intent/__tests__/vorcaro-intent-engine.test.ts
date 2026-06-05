import { describe, expect, it, beforeEach, vi } from "vitest";
import { VorcaroIntentEngineService } from "../application/services/vorcaro-intent-engine.service";
import { VorcaroToolResolverService } from "../application/services/vorcaro-tool-resolver.service";
import { VorcaroIntentResponseFormatter } from "../application/services/vorcaro-intent-response-formatter.service";
import { VorcaroIntentCacheService } from "../application/services/vorcaro-intent-cache.service";
import { VorcaroIntentObservabilityService } from "../application/services/vorcaro-intent-observability.service";
import type { VorcaroToolResult } from "../domain/types/vorcaro-intent";

describe("VorcaroIntentEngineService", () => {
  const engine = new VorcaroIntentEngineService();

  it("detecta STATUS para pergunta de situação financeira", () => {
    const result = engine.detect("Como estou financeiramente?");
    expect(result.primary).toBe("STATUS");
    expect(result.requiresLlm).toBe(false);
    expect(result.related).toContain("HEALTH_SCORE");
  });

  it("detecta ALERTS", () => {
    expect(engine.detect("Quais alertas eu tenho?").primary).toBe("ALERTS");
  });

  it("detecta RECEIVABLES", () => {
    expect(engine.detect("Quem está me devendo?").primary).toBe("RECEIVABLES");
  });

  it("detecta FOLLOWUPS", () => {
    expect(engine.detect("Quais pendências tenho?").primary).toBe("FOLLOWUPS");
    expect(engine.detect("Tenho algo parado?").requiresLlm).toBe(false);
  });

  it("detecta RULES_AUTOMATIONS", () => {
    expect(engine.detect("Quais regras existem?").primary).toBe("RULES_AUTOMATIONS");
  });

  it("detecta CATEGORY_LIST e CARD_LIST", () => {
    expect(engine.detect("Mostre minhas categorias").primary).toBe("CATEGORY_LIST");
    expect(engine.detect("Quais cartões tenho?").primary).toBe("CARD_LIST");
  });

  it("detecta CATEGORY_AUDIT sem LLM", () => {
    expect(engine.detect("Vorcaro, minhas categorias estão boas?").primary).toBe("CATEGORY_AUDIT");
    expect(engine.detect("Existem categorias duplicadas?").requiresLlm).toBe(false);
    expect(engine.detect("O que posso melhorar nas categorias?").primary).toBe("CATEGORY_AUDIT");
    expect(engine.detect("Tem categorias redundantes?").primary).toBe("CATEGORY_AUDIT");
  });

  it("exige LLM para perguntas estratégicas", () => {
    const result = engine.detect("O que você faria no meu lugar?");
    expect(result.primary).toBe("STRATEGIC_ADVICE");
    expect(result.requiresLlm).toBe(true);
  });

  it("detecta TIMELINE e EVOLUTION sem LLM", () => {
    expect(engine.detect("Mostre minha linha do tempo financeira").primary).toBe("TIMELINE");
    expect(engine.detect("Como foi minha evolução?").primary).toBe("EVOLUTION");
    expect(engine.detect("Quais conquistas tenho?").primary).toBe("ACHIEVEMENTS");
    expect(engine.detect("Qual a tendência dos meus gastos?").primary).toBe("TRENDS");
    expect(engine.detect("Comparar minha evolução nos últimos meses").requiresLlm).toBe(false);
  });

  it("mapeia comandos slash", () => {
    expect(engine.detect("/status").primary).toBe("STATUS");
    expect(engine.detect("/alertas").primary).toBe("ALERTS");
    expect(engine.detect("/recebiveis").primary).toBe("RECEIVABLES");
  });
});

describe("VorcaroToolResolverService", () => {
  const resolver = new VorcaroToolResolverService();

  it("resolve STATUS para múltiplas ferramentas", () => {
    const tools = resolver.resolve("STATUS", ["HEALTH_SCORE", "ALERTS"]);
    expect(tools).toContain("financial_health");
    expect(tools).toContain("financial_alerts");
    expect(tools).toContain("monthly_commitments");
  });

  it("resolve RULES_AUTOMATIONS", () => {
    expect(resolver.resolve("RULES_AUTOMATIONS")).toEqual(["rules_automation"]);
  });

  it("resolve CATEGORY_AUDIT", () => {
    expect(resolver.resolve("CATEGORY_AUDIT")).toEqual(["category_audit"]);
  });

  it("resolve CATEGORY_LIST e CARD_LIST", () => {
    expect(resolver.resolve("CATEGORY_LIST")).toEqual(["category_list"]);
    expect(resolver.resolve("CARD_LIST")).toEqual(["card_list"]);
  });

  it("resolve EVOLUTION e TRENDS com tools dedicadas", () => {
    expect(resolver.resolve("EVOLUTION")).toEqual(["financial_evolution"]);
    expect(resolver.resolve("TRENDS")).toEqual(["financial_trends"]);
    expect(resolver.resolve("TIMELINE")).toEqual(["financial_timeline"]);
    expect(resolver.resolve("ACHIEVEMENTS")).toEqual(["financial_achievements"]);
  });

  it("resolve FOLLOWUPS para follow_ups", () => {
    expect(resolver.resolve("FOLLOWUPS")).toEqual(["follow_ups"]);
  });

  it("STRATEGIC_ADVICE não resolve ferramentas", () => {
    expect(resolver.resolve("STRATEGIC_ADVICE")).toEqual([]);
  });
});

describe("VorcaroIntentResponseFormatter", () => {
  const formatter = new VorcaroIntentResponseFormatter();

  it("formata resposta FIA para ferramenta única", () => {
    const result: VorcaroToolResult = {
      intent: "ALERTS",
      title: "Alertas",
      summary: "2 alertas abertos.",
      facts: ["Alerta A"],
      metrics: { open: 2 },
      recommendations: ["Revise hoje."],
    };
    const text = formatter.format([result]);
    expect(text).toContain("**FATO**");
    expect(text).toContain("**IMPACTO**");
    expect(text).toContain("**AÇÃO**");
  });
});

describe("VorcaroIntentCacheService", () => {
  it("expira entradas após TTL", () => {
    const cache = new VorcaroIntentCacheService();
    const key = cache.buildToolKey("user-1", "financial_health");
    cache.setToolResult(key, {
      intent: "HEALTH_SCORE",
      title: "Saúde",
      summary: "ok",
      facts: [],
      metrics: {},
      recommendations: [],
    });
    expect(cache.getToolResult(key)?.summary).toBe("ok");
    vi.useFakeTimers();
    vi.advanceTimersByTime(61_000);
    expect(cache.getToolResult(key)).toBeNull();
    vi.useRealTimers();
  });
});

describe("VorcaroIntentObservabilityService", () => {
  let obs: VorcaroIntentObservabilityService;

  beforeEach(() => {
    obs = new VorcaroIntentObservabilityService();
  });

  it("registra métricas de intent e tool", () => {
    obs.recordIntentDetected();
    obs.recordToolCalled(3);
    obs.recordToolOnlyResponse();
    const snap = obs.snapshot();
    expect(snap.intent_detected).toBe(1);
    expect(snap.tool_called).toBe(3);
    expect(snap.tool_only_response).toBe(1);
  });
});
