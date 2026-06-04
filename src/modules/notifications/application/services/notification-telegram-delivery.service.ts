import type { PrismaClient } from "@prisma/client";
import { sendTelegramMessageWithMode } from "@/lib/telegram/telegram-bot.client";
import { PrismaTelegramIntegrationRepository } from "@/modules/telegram/infrastructure/prisma-telegram-integration.repository";
import type { NotificationRecord } from "../../domain/types/notification";
import { PrismaNotificationRepository } from "../../infrastructure/repositories/prisma-notification.repository";

export const TELEGRAM_RATE_LIMIT_PER_HOUR = 3;

export class NotificationTelegramDeliveryService {
  private readonly notifications: PrismaNotificationRepository;
  private readonly telegram: PrismaTelegramIntegrationRepository;

  constructor(private readonly db: PrismaClient) {
    this.notifications = new PrismaNotificationRepository(db);
    this.telegram = new PrismaTelegramIntegrationRepository(db);
  }

  async canSend(userId: string, now = new Date()): Promise<boolean> {
    const since = new Date(now.getTime() - 60 * 60 * 1000);
    const count = await this.notifications.countTelegramSentSince(userId, since);
    return count < TELEGRAM_RATE_LIMIT_PER_HOUR;
  }

  async deliver(notification: NotificationRecord): Promise<boolean> {
    if (notification.channel !== "TELEGRAM") return false;

    const connection = await this.telegram.findActiveConnectionByUserId(notification.userId);
    if (!connection) {
      await this.notifications.updateStatus(notification.id, notification.userId, "FAILED");
      return false;
    }

    if (!(await this.canSend(notification.userId))) {
      return false;
    }

    try {
      const text = this.formatMessage(notification);
      await sendTelegramMessageWithMode(
        Number(connection.telegramChatId),
        text,
        "MarkdownV2",
      );
      await this.notifications.updateStatus(notification.id, notification.userId, "SENT", {
        sentAt: new Date(),
      });
      return true;
    } catch {
      await this.notifications.updateStatus(notification.id, notification.userId, "FAILED");
      return false;
    }
  }

  private formatMessage(notification: NotificationRecord): string {
    const escape = (s: string) => s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
    const lines = [
      `*${escape(notification.title)}*`,
      escape(notification.message),
    ];
    const actionUrl = notification.payload?.actionUrl;
    if (typeof actionUrl === "string" && actionUrl) {
      lines.push(`Ação: ${escape(actionUrl)}`);
    }
    return lines.join("\n");
  }
}
