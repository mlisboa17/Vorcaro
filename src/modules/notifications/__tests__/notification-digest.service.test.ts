import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NotificationDigestService } from "../application/services/notification-digest.service";

describe("NotificationDigestService", () => {
  it("gera digest diário idempotente por fingerprint", async () => {
    const notifications: Array<Record<string, unknown>> = [];
    const db = {
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: "user-1" }]),
        findUnique: vi.fn().mockResolvedValue({ vorcaroTone: "PROFESSIONAL" }),
      },
      vorcaroMessageHistory: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      notification: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(async ({ where }: { where: { userId_fingerprint: { fingerprint: string } } }) =>
          notifications.find((n) => n.fingerprint === where.userId_fingerprint.fingerprint) ?? null,
        ),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const fp = String(data.fingerprint);
          if (notifications.some((n) => n.fingerprint === fp)) {
            throw new Error("Unique constraint failed");
          }
          const row = { id: "d1", ...data };
          notifications.push(row);
          return row;
        }),
        count: vi.fn().mockResolvedValue(0),
      },
      notificationPreference: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "p1",
            userId: "user-1",
            notificationType: "DAILY_DIGEST",
            dashboardEnabled: true,
            telegramEnabled: false,
            digestEnabled: true,
          },
        ]),
        create: vi.fn(),
      },
    } as unknown as PrismaClient;

    const service = new NotificationDigestService(db);
    const first = await service.runDailyDigestForUser("user-1", new Date("2026-06-04T08:00:00Z"));
    const second = await service.runDailyDigestForUser("user-1", new Date("2026-06-04T08:00:00Z"));

    expect(first.dailyCreated).toBe(true);
    expect(second.dailyCreated).toBe(false);
  });

  it("gera digest semanal", async () => {
    const db = {
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: "user-1" }]),
        findUnique: vi.fn().mockResolvedValue({ vorcaroTone: "PROFESSIONAL" }),
      },
      vorcaroMessageHistory: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      notification: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: "w1",
          ...data,
        })),
        count: vi.fn().mockResolvedValue(0),
      },
      notificationPreference: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "p2",
            userId: "user-1",
            notificationType: "WEEKLY_DIGEST",
            dashboardEnabled: true,
            telegramEnabled: false,
            digestEnabled: true,
          },
        ]),
        create: vi.fn(),
      },
    } as unknown as PrismaClient;

    const service = new NotificationDigestService(db);
    const result = await service.runWeeklyDigestForUser("user-1", new Date("2026-06-02T08:00:00Z"));
    expect(result.weeklyCreated).toBe(true);
  });
});
