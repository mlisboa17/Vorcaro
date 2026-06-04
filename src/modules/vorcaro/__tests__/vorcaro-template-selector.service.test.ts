import { describe, expect, it } from "vitest";
import { VorcaroTemplateSelectorService } from "../application/services/vorcaro-template-selector.service";
import { VORCARO_TEMPLATE_LIBRARY } from "../domain/vorcaro-template-library";

describe("VorcaroTemplateSelectorService", () => {
  const selector = new VorcaroTemplateSelectorService();

  it("evita templates bloqueados recentemente", () => {
    const deliveryTemplates = VORCARO_TEMPLATE_LIBRARY.filter((t) => t.category === "DELIVERY");
    const blocked = deliveryTemplates.slice(0, 3).map((t) => t.id);

    const selected = selector.select("DELIVERY", "VORCARO", {
      recentTemplateIds: blocked,
      blockedTemplateIds: blocked,
    });

    expect(selected).not.toBeNull();
    expect(blocked).not.toContain(selected!.id);
  });

  it("resolve observação pelo tom", () => {
    const template = VORCARO_TEMPLATE_LIBRARY.find((t) => t.category === "DELIVERY");
    expect(template).toBeDefined();

    const observation = selector.resolveObservation(template!, "REALITY_AUDITOR");
    expect(observation).toBeTruthy();
    expect(typeof observation).toBe("string");
  });

  it("seleciona entre os 6 tons sem erro", () => {
    for (const tone of [
      "PROFESSIONAL",
      "DIRECT",
      "BALANCED",
      "VORCARO",
      "IMPACT",
      "REALITY_AUDITOR",
    ] as const) {
      const selected = selector.select("MONEY_LEAK", tone, {
        recentTemplateIds: [],
        blockedTemplateIds: [],
      });
      expect(selected).not.toBeNull();
    }
  });

  it("seleciona 3–5 templates elegíveis para LLM", () => {
    const eligible = selector.selectEligibleForLlm("DELIVERY", "BALANCED", {
      recentTemplateIds: [],
      blockedTemplateIds: [],
    });
    expect(eligible.length).toBeGreaterThanOrEqual(3);
    expect(eligible.length).toBeLessThanOrEqual(5);
  });
});
