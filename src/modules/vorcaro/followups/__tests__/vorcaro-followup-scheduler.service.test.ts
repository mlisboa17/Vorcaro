import { describe, expect, it, vi, beforeEach } from "vitest";
import { VorcaroFollowUpSchedulerService } from "../application/services/vorcaro-followup-scheduler.service";
import type { VorcaroFollowUpRecord } from "../domain/types/vorcaro-followup";

vi.mock("@/modules/notifications/application/services/notification-center.service", () => ({
  NotificationCenterService: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue({ created: 1, skipped: 0, deliveredTelegram: 0, notifications: [] }),
  })),
}));

function makeRecord(overrides: Partial<VorcaroFollowUpRecord> = {}): VorcaroFollowUpRecord {
  return {
    id: "fu-1",
    userId: "user-1",
    fingerprint: "GOAL:g1:OPEN_GOAL",
    relatedEntityId: "g1",
    relatedEntityType: "GOAL",
    title: "Meta",
    description: "Acompanhe",
    status: "ACTIVE",
    nextCheckAt: new Date("2026-01-01"),
    lastReminderAt: null,
    checkCount: 0,
    version: 0,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("VorcaroFollowUpSchedulerService", () => {
  const prisma = {} as never;
  let scheduler: VorcaroFollowUpSchedulerService;
  let listDueActive: ReturnType<typeof vi.fn>;
  let updateWithVersion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scheduler = new VorcaroFollowUpSchedulerService(prisma);
    listDueActive = vi.fn();
    updateWithVersion = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scheduler as any).repo = { listDueActive, updateWithVersion };
  });

  it("expira após o 5º lembrete", async () => {
    const followUp = makeRecord({ checkCount: 4, version: 2 });
    listDueActive.mockResolvedValue([followUp]);
    updateWithVersion.mockResolvedValue({ ...followUp, status: "EXPIRED", checkCount: 5 });

    const now = new Date("2026-06-10T08:00:00.000Z");
    const stats = await scheduler.run(now);

    expect(stats.expired).toBe(1);
    expect(updateWithVersion).toHaveBeenCalledWith(
      followUp.id,
      followUp.userId,
      followUp.version,
      expect.objectContaining({ status: "EXPIRED", checkCount: 5 }),
    );
  });

  it("recalcula nextCheckAt com backoff após lembrete intermediário", async () => {
    const followUp = makeRecord({ checkCount: 1, version: 1 });
    listDueActive.mockResolvedValue([followUp]);
    updateWithVersion.mockResolvedValue({ ...followUp, checkCount: 2 });

    const now = new Date("2026-06-10T08:00:00.000Z");
    await scheduler.run(now);

    const updateArg = updateWithVersion.mock.calls[0][3];
    expect(updateArg.checkCount).toBe(2);
    expect(updateArg.nextCheckAt.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
