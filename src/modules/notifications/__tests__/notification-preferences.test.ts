import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaNotificationPreferenceRepository } from "../infrastructure/repositories/prisma-notification-preference.repository";
import { NOTIFICATION_TYPES } from "../domain/types/notification";

describe("PrismaNotificationPreferenceRepository", () => {
  it("cria preferências padrão Dashboard ON, Telegram OFF, Digest ON", async () => {
    const created: Array<Record<string, unknown>> = [];
    const db = {
      notificationPreference: {
        findMany: vi.fn(async () => created),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `p-${created.length}`, ...data };
          created.push(row);
          return row;
        }),
      },
    } as unknown as PrismaClient;

    const repo = new PrismaNotificationPreferenceRepository(db);
    const prefs = await repo.ensureDefaults("user-1");

    expect(prefs).toHaveLength(NOTIFICATION_TYPES.length);
    expect(prefs.every((p) => p.dashboardEnabled === true)).toBe(true);
    expect(prefs.every((p) => p.telegramEnabled === false)).toBe(true);
    expect(prefs.every((p) => p.digestEnabled === true)).toBe(true);
  });
});
