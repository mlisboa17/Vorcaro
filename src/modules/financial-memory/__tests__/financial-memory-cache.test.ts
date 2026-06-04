import { describe, expect, it, vi, afterEach } from "vitest";
import { FinancialMemoryQueryService } from "../application/services/financial-memory-query.service";
import { FinancialEvolutionProfileService } from "../application/services/financial-evolution-profile.service";

describe("FinancialMemoryQueryService cache (M-02)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("não reexecuta engine dentro do TTL de 5 minutos", async () => {
    vi.useFakeTimers();
    const runForUser = vi.fn().mockResolvedValue({
      userId: "user-1",
      snapshotsRecorded: 1,
      eventsCreated: 2,
      achievementsUnlocked: 0,
      durationMs: 10,
    });
    const prisma = {} as never;
    const service = new FinancialMemoryQueryService(prisma);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).engine = { runForUser };

    await service.refresh("user-1");
    await service.refresh("user-1");

    expect(runForUser).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await service.refresh("user-1");
    expect(runForUser).toHaveBeenCalledTimes(2);
  });
});

describe("FinancialEvolutionProfileService cache", () => {
  it("reutiliza perfil computado no TTL", async () => {
    const comparison = {
      getHistoryDaysAvailable: vi.fn().mockResolvedValue(90),
      compare: vi.fn().mockResolvedValue({
        deltas: { healthScore: 0, monthlyCashflow: 0, monthlyExpenses: 0 },
        past: { healthScore: 70 },
      }),
    };
    const consultant = {
      consult: vi.fn().mockResolvedValue({ healthScore: { score: 75 } }),
    };
    const planning = {
      getGoals: vi.fn().mockResolvedValue([]),
    };

    const prisma = {} as never;
    const service = new FinancialEvolutionProfileService(prisma);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.assign(service, { comparison, consultant, planning });

    const first = await service.compute("u1");
    const second = await service.compute("u1");

    expect(first).toBe(second);
    expect(consultant.consult).toHaveBeenCalledTimes(1);
  });
});
