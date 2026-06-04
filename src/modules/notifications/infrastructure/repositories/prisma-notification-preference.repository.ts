import type { PrismaClient } from "@prisma/client";
import {
  NOTIFICATION_TYPES,
  type NotificationPreferenceRecord,
  type NotificationType,
} from "../../domain/types/notification";

function toRecord(row: {
  id: string;
  userId: string;
  notificationType: string;
  dashboardEnabled: boolean;
  telegramEnabled: boolean;
  digestEnabled: boolean;
}): NotificationPreferenceRecord {
  return {
    id: row.id,
    userId: row.userId,
    notificationType: row.notificationType as NotificationType,
    dashboardEnabled: row.dashboardEnabled,
    telegramEnabled: row.telegramEnabled,
    digestEnabled: row.digestEnabled,
  };
}

export class PrismaNotificationPreferenceRepository {
  constructor(private readonly db: PrismaClient) {}

  async ensureDefaults(userId: string): Promise<NotificationPreferenceRecord[]> {
    const existing = await this.db.notificationPreference.findMany({ where: { userId } });
    const existingTypes = new Set(existing.map((r) => r.notificationType));

    for (const notificationType of NOTIFICATION_TYPES) {
      if (existingTypes.has(notificationType)) continue;
      await this.db.notificationPreference.create({
        data: {
          userId,
          notificationType,
          dashboardEnabled: true,
          telegramEnabled: false,
          digestEnabled: true,
        },
      });
    }

    const rows = await this.db.notificationPreference.findMany({
      where: { userId },
      orderBy: { notificationType: "asc" },
    });
    return rows.map(toRecord);
  }

  async findByUserId(userId: string): Promise<NotificationPreferenceRecord[]> {
    return this.ensureDefaults(userId);
  }

  async findByType(userId: string, type: NotificationType): Promise<NotificationPreferenceRecord> {
    const rows = await this.ensureDefaults(userId);
    const pref = rows.find((r) => r.notificationType === type);
    if (!pref) {
      throw new Error(`Preference not found for ${type}`);
    }
    return pref;
  }

  async update(
    userId: string,
    notificationType: NotificationType,
    patch: Partial<Pick<NotificationPreferenceRecord, "dashboardEnabled" | "telegramEnabled" | "digestEnabled">>,
  ): Promise<NotificationPreferenceRecord> {
    await this.ensureDefaults(userId);
    const row = await this.db.notificationPreference.update({
      where: { userId_notificationType: { userId, notificationType } },
      data: patch,
    });
    return toRecord(row);
  }
}
