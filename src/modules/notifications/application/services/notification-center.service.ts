import type { PrismaClient } from "@prisma/client";
import type { FinancialAlertType } from "@prisma/client";
import {
  buildDeliveryFingerprint,
} from "../../domain/services/notification-fingerprint";
import type {
  NotificationSeverity,
  NotificationType,
  PublishNotificationInput,
} from "../../domain/types/notification";
import { TELEGRAM_IMMEDIATE_TYPES } from "../../domain/types/notification";
import { PrismaNotificationPreferenceRepository } from "../../infrastructure/repositories/prisma-notification-preference.repository";
import { PrismaNotificationRepository } from "../../infrastructure/repositories/prisma-notification.repository";
import { NotificationTelegramDeliveryService } from "./notification-telegram-delivery.service";

export type PublishResult = {
  created: number;
  skipped: number;
  deliveredTelegram: number;
  notifications: string[];
};

const ALERT_TYPE_TO_NOTIFICATION: Partial<Record<FinancialAlertType, NotificationType>> = {
  OVERDUE_RECEIVABLE: "RECEIVABLE_OVERDUE",
  GOAL_AT_RISK: "GOAL_AT_RISK",
  CASHFLOW_WARNING: "CASHFLOW_WARNING",
  HIGH_COMMITMENT_MONTH: "HIGH_COMMITMENT_MONTH",
  UPCOMING_PAYMENT: "ALERT_CREATED",
  CREDIT_CARD_RISK: "ALERT_CREATED",
  REIMBURSEMENT_DELAY: "ALERT_CREATED",
};

export class NotificationCenterService {
  private readonly notifications: PrismaNotificationRepository;
  private readonly preferences: PrismaNotificationPreferenceRepository;
  private readonly telegram: NotificationTelegramDeliveryService;

  constructor(private readonly db: PrismaClient) {
    this.notifications = new PrismaNotificationRepository(db);
    this.preferences = new PrismaNotificationPreferenceRepository(db);
    this.telegram = new NotificationTelegramDeliveryService(db);
  }

  mapAlertType(alertType: FinancialAlertType): NotificationType {
    return ALERT_TYPE_TO_NOTIFICATION[alertType] ?? "ALERT_CREATED";
  }

  async publish(input: PublishNotificationInput): Promise<PublishResult> {
    await this.preferences.ensureDefaults(input.userId);
    const pref = await this.preferences.findByType(input.userId, input.type);

    const result: PublishResult = {
      created: 0,
      skipped: 0,
      deliveredTelegram: 0,
      notifications: [],
    };

    const payload = {
      ...(input.payload ?? {}),
      ...(input.actionUrl ? { actionUrl: input.actionUrl } : {}),
    };

    if (pref.dashboardEnabled) {
      const fp = buildDeliveryFingerprint(input.type, input.userId, input.entityKey, "DASHBOARD");
      const { record, created } = await this.notifications.create({
        userId: input.userId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        channel: "DASHBOARD",
        fingerprint: fp,
        payload,
        status: "SENT",
        sentAt: new Date(),
      });
      if (created) {
        result.created += 1;
        result.notifications.push(record.id);
      } else {
        result.skipped += 1;
      }
    }

    const telegramAllowed =
      pref.telegramEnabled && (TELEGRAM_IMMEDIATE_TYPES as readonly string[]).includes(input.type);

    if (telegramAllowed) {
      const fp = buildDeliveryFingerprint(input.type, input.userId, input.entityKey, "TELEGRAM");
      const { record, created } = await this.notifications.create({
        userId: input.userId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        channel: "TELEGRAM",
        fingerprint: fp,
        payload,
        status: "PENDING",
      });

      if (created) {
        result.created += 1;
        result.notifications.push(record.id);
        const sent = await this.telegram.deliver(record);
        if (sent) result.deliveredTelegram += 1;
      } else {
        result.skipped += 1;
      }
    }

    return result;
  }

  async publishFromAlert(input: {
    userId: string;
    alertType: FinancialAlertType;
    severity: NotificationSeverity;
    title: string;
    description: string;
    fingerprint: string;
    actionUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<PublishResult> {
    const type = this.mapAlertType(input.alertType);
    return this.publish({
      userId: input.userId,
      type,
      severity: input.severity,
      title: input.title,
      message: input.description,
      entityKey: input.fingerprint,
      actionUrl: input.actionUrl,
      payload: input.metadata ?? undefined,
    });
  }

  async markRead(id: string, userId: string) {
    return this.notifications.updateStatus(id, userId, "READ", { readAt: new Date() });
  }

  async dismiss(id: string, userId: string) {
    return this.notifications.updateStatus(id, userId, "DISMISSED");
  }
}
