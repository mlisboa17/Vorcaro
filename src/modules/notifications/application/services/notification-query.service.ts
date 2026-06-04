import type { PrismaClient } from "@prisma/client";
import type {
  NotificationChannel,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
} from "../../domain/types/notification";
import { PrismaNotificationRepository } from "../../infrastructure/repositories/prisma-notification.repository";

export class NotificationQueryService {
  private readonly repo: PrismaNotificationRepository;

  constructor(db: PrismaClient) {
    this.repo = new PrismaNotificationRepository(db);
  }

  async list(input: {
    userId: string;
    page?: number;
    pageSize?: number;
    status?: NotificationStatus | NotificationStatus[];
    type?: NotificationType;
    channel?: NotificationChannel;
    severity?: NotificationSeverity;
  }) {
    return this.repo.list({
      userId: input.userId,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
      status: input.status,
      type: input.type,
      channel: input.channel,
      severity: input.severity,
    });
  }

  async getSummary(userId: string) {
    const [unreadCount, byStatus] = await Promise.all([
      this.repo.countUnread(userId),
      this.repo.countByStatus(userId),
    ]);
    return { unreadCount, byStatus };
  }
}
