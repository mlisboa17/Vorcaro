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

  it("detecta RULES_AUTOMATIONS", () => {
    expect(engine.detect("Quais regras existem?").primary).toBe("RULES_AUTOMATIONS");
  });

  it("exige LLM para perguntas estratégicas", () => {
    const result = engine.detect("O que você faria no meu lugar?");
    expect(result.requiresLlm).toBe(true);
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
