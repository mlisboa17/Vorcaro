import { describe, expect, it, vi, beforeEach } from "vitest";
import { FinancialComparisonService } from "../application/services/financial-comparison.service";
import { MIN_HISTORY_DAYS_FOR_ANALYSIS } from "../domain/types/financial-memory";

const mockRepo = {
  getFirstSnapshotDate: vi.fn(),
  getLatestSnapshot: vi.fn(),
  findSnapshotOnOrBefore: vi.fn(),
};

vi.mock("../infrastructure/repositories/prisma-financial-memory.repository", () => ({
  PrismaFinancialMemoryRepository: class {
    getFirstSnapshotDate = mockRepo.getFirstSnapshotDate;
    getLatestSnapshot = mockRepo.getLatestSnapshot;
    findSnapshotOnOrBefore = mockRepo.findSnapshotOnOrBefore;
  },
}));

describe("FinancialComparisonService", () => {
  let service: FinancialComparisonService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FinancialComparisonService({} as never);
  });

  it("exige 30 dias de histórico", () => {
    expect(service.hasSufficientHistory(MIN_HISTORY_DAYS_FOR_ANALYSIS - 1)).toBe(false);
    expect(service.hasSufficientHistory(MIN_HISTORY_DAYS_FOR_ANALYSIS)).toBe(true);
  });

  it("calcula deltas quando há snapshots", async () => {
    const now = new Date();
    mockRepo.getFirstSnapshotDate.mockResolvedValue(new Date(now.getTime() - 40 * 86400000));
    mockRepo.getLatestSnapshot.mockResolvedValue({
      id: "1",
      userId: "u1",
      snapshotDate: now,
      healthScore: 80,
      netWorth: 110000,
      totalDebt: 20000,
      monthlyIncome: 10000,
      monthlyExpenses: 6000,
      monthlyCashflow: 4000,
    });
    mockRepo.findSnapshotOnOrBefore.mockResolvedValue({
      id: "2",
      userId: "u1",
      snapshotDate: new Date(now.getTime() - 30 * 86400000),
      healthScore: 70,
      netWorth: 100000,
      totalDebt: 22000,
      monthlyIncome: 9000,
      monthlyExpenses: 6500,
      monthlyCashflow: 2500,
    });

    const result = await service.compare("u1", 30);
    expect(result.hasSufficientHistory).toBe(true);
    expect(result.deltas.healthScore).toBe(10);
    expect(result.deltas.netWorthPercent).toBe(10);
  });
});
