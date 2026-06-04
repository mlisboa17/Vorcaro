import type { Prisma, PrismaClient, Notification as PrismaNotification } from "@prisma/client";
import type {
  NotificationChannel,
  NotificationRecord,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
} from "../../domain/types/notification";

function toRecord(row: PrismaNotification): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    severity: row.severity as NotificationSeverity,
    status: row.status as NotificationStatus,
    title: row.title,
    message: row.message,
    channel: row.channel as NotificationChannel,
    fingerprint: row.fingerprint,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    readAt: row.readAt,
  };
}

export class PrismaNotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByFingerprint(userId: string, fingerprint: string): Promise<NotificationRecord | null> {
    const row = await this.db.notification.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
    });
    return row ? toRecord(row) : null;
  }

  async create(input: {
    userId: string;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    message: string;
    channel: NotificationChannel;
    fingerprint: string;
    payload?: Record<string, unknown> | null;
    status?: NotificationStatus;
    sentAt?: Date | null;
  }): Promise<{ record: NotificationRecord; created: boolean }> {
    try {
      const row = await this.db.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          channel: input.channel,
          fingerprint: input.fingerprint,
          payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
          status: input.status ?? "PENDING",
          sentAt: input.sentAt ?? undefined,
        },
      });
      return { record: toRecord(row), created: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        const existing = await this.findByFingerprint(input.userId, input.fingerprint);
        if (existing) return { record: existing, created: false };
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    userId: string,
    status: NotificationStatus,
    extra?: { sentAt?: Date; readAt?: Date },
  ): Promise<NotificationRecord | null> {
    const row = await this.db.notification.updateMany({
      where: { id, userId },
      data: { status, ...extra },
    });
    if (row.count === 0) return null;
    const updated = await this.db.notification.findFirst({ where: { id, userId } });
    return updated ? toRecord(updated) : null;
  }

  async list(input: {
    userId: string;
    status?: NotificationStatus | NotificationStatus[];
    type?: NotificationType;
    channel?: NotificationChannel;
    severity?: NotificationSeverity;
    page: number;
    pageSize: number;
  }) {
    const where = {
      userId: input.userId,
      ...(input.type ? { type: input.type } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.status
        ? {
            status: Array.isArray(input.status) ? { in: input.status } : input.status,
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.db.notification.count({ where }),
    ]);

    return { items: rows.map(toRecord), total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.db.notification.count({
      where: {
        userId,
        channel: "DASHBOARD",
        status: { in: ["PENDING", "SENT"] },
      },
    });
  }

  async countByStatus(userId: string): Promise<Record<NotificationStatus, number>> {
    const groups = await this.db.notification.groupBy({
      by: ["status"],
      where: { userId, channel: "DASHBOARD" },
      _count: { _all: true },
    });

    const result: Record<NotificationStatus, number> = {
      PENDING: 0,
      SENT: 0,
      READ: 0,
      DISMISSED: 0,
      FAILED: 0,
    };

    for (const g of groups) {
      result[g.status as NotificationStatus] = g._count._all;
    }

    return result;
  }

  async countTelegramSentSince(userId: string, since: Date): Promise<number> {
    return this.db.notification.count({
      where: {
        userId,
        channel: "TELEGRAM",
        status: "SENT",
        sentAt: { gte: since },
      },
    });
  }

  async listForDigest(userId: string, since: Date, types: NotificationType[]) {
    const rows = await this.db.notification.findMany({
      where: {
        userId,
        type: { in: types },
        createdAt: { gte: since },
        status: { not: "DISMISSED" },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
    return rows.map(toRecord);
  }
}
