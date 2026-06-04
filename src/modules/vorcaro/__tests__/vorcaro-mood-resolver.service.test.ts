import { describe, expect, it } from "vitest";
import { VorcaroMoodResolverService } from "../application/services/vorcaro-mood-resolver.service";

describe("VorcaroMoodResolverService", () => {
  const resolver = new VorcaroMoodResolverService();

  it("retorna CONCERNED com fluxo negativo iminente", () => {
    const result = resolver.resolve({
      negativeCashflowDays: 9,
      criticalAlertCount: 1,
    });
    expect(result.mood).toBe("CONCERNED");
    expect(result.hint).toContain("9 dias");
  });

  it("retorna FOCUSED quando há oportunidade de economia", () => {
    const result = resolver.resolve({ savingsOpportunityMonthly: 200 });
    expect(result.mood).toBe("FOCUSED");
    expect(result.hint).toContain("oportunidade");
  });

  it("retorna CELEBRATING quando dívida quitada", () => {
    const result = resolver.resolve({ debtRecentlyPaid: true });
    expect(result.mood).toBe("CELEBRATING");
  });

  it("retorna NORMAL sem sinais relevantes", () => {
    expect(resolver.resolve({}).mood).toBe("NORMAL");
  });
});
