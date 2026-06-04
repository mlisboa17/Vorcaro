import { describe, expect, it } from "vitest";
import { VorcaroIntentEngineService } from "../application/services/vorcaro-intent-engine.service";

describe("Intent synonyms (Sprint 14.6 — M-01)", () => {
  const engine = new VorcaroIntentEngineService();

  it("classifica sinônimos de FOLLOWUPS", () => {
    expect(engine.detect("o que esqueci").primary).toBe("FOLLOWUPS");
    expect(engine.detect("o que ainda não resolvi").primary).toBe("FOLLOWUPS");
  });

  it("classifica sinônimos de ALERTS", () => {
    expect(engine.detect("existe algum risco").primary).toBe("ALERTS");
    expect(engine.detect("algo preocupante").primary).toBe("ALERTS");
    expect(engine.detect("tenho problemas financeiros").primary).toBe("ALERTS");
    expect(engine.detect("Quais metas estão em risco?").primary).toBe("GOALS");
  });

  it("classifica sinônimos de STATUS", () => {
    expect(engine.detect("como estou?").primary).toBe("STATUS");
    expect(engine.detect("resumo financeiro").primary).toBe("STATUS");
    expect(engine.detect("visão geral").primary).toBe("STATUS");
  });

  it("classifica recebíveis atrasados", () => {
    expect(engine.detect("Tenho recebíveis atrasados?").primary).toBe("RECEIVABLES");
  });
});
