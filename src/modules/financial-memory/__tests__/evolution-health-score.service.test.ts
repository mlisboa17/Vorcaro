import { describe, expect, it, vi, beforeEach } from "vitest";
import { EvolutionHealthScoreService } from "../application/services/evolution-health-score.service";

const compareMock = vi.fn();

vi.mock("../application/services/financial-comparison.service", () => ({
  FinancialComparisonService: class {
    compare = compareMock;
  },
}));

describe("EvolutionHealthScoreService", () => {
  beforeEach(() => {
    compareMock.mockReset();
  });

  it("formata label com delta", async () => {
    compareMock.mockResolvedValue({
      hasSufficientHistory: true,
      current: { healthScore: 81 },
      past: { healthScore: 72 },
      deltas: {},
    });
    const service = new EvolutionHealthScoreService({} as never);
    const result = await service.compute("u1");
    expect(result.label).toContain("72");
    expect(result.label).toContain("81");
    expect(result.delta).toBe(9);
  });

  it("indica histórico insuficiente", async () => {
    compareMock.mockResolvedValue({
      hasSufficientHistory: false,
      current: { healthScore: 50 },
      past: null,
      deltas: {},
    });
    const service = new EvolutionHealthScoreService({} as never);
    const result = await service.compute("u1");
    expect(result.hasSufficientHistory).toBe(false);
  });
});
