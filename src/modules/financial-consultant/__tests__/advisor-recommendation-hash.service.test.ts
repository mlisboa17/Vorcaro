import { describe, expect, it } from "vitest";
import { AdvisorRecommendationHashService } from "../domain/services/advisor-recommendation-hash.service";

describe("AdvisorRecommendationHashService", () => {
  const service = new AdvisorRecommendationHashService();

  it("gera o mesmo hash para os mesmos parâmetros no mesmo mês", () => {
    const input = {
      userId: "user-1",
      actionType: "REVIEW_SUBSCRIPTIONS",
      category: "SUBSCRIPTION",
      normalizedName: "Netflix",
      relatedEntityId: "netflix",
      month: "2026-06",
    };
    expect(service.compute(input)).toBe(service.compute(input));
  });

  it("gera hashes diferentes para meses diferentes", () => {
    const base = {
      userId: "user-1",
      actionType: "REVIEW_SUBSCRIPTIONS",
      category: "SUBSCRIPTION",
      normalizedName: "Netflix",
      relatedEntityId: "netflix",
    };
    expect(service.compute({ ...base, month: "2026-05" })).not.toBe(
      service.compute({ ...base, month: "2026-06" }),
    );
  });

  it("valida formato hex de 64 caracteres", () => {
    const hash = service.compute({
      userId: "u",
      actionType: "VIEW_ALERTS",
      month: "2026-06",
    });
    expect(service.isValidFormat(hash)).toBe(true);
    expect(service.isValidFormat("invalid")).toBe(false);
  });
});
