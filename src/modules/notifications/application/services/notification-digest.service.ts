import type { PrismaClient } from "@prisma/client";
import { buildDigestFingerprint } from "../../domain/services/notification-fingerprint";
import type { NotificationType } from "../../domain/types/notification";
import { PrismaNotificationPreferenceRepository } from "../../infrastructure/repositories/prisma-notification-preference.repository";
import { PrismaNotificationRepository } from "../../infrastructure/repositories/prisma-notification.repository";
import { VorcaroMessagingService } from "@/modules/vorcaro/application/services/vorcaro-messaging.service";
import { NotificationTelegramDeliveryService } from "./notification-telegram-delivery.service";

export type DigestRunStats = {
  userId: string;
  dailyCreated: boolean;
  weeklyCreated: boolean;
  telegramSent: boolean;
};

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

export class NotificationDigestService {
  private readonly notifications: PrismaNotificationRepository;
  private readonly preferences: PrismaNotificationPreferenceRepository;
  private readonly telegram: NotificationTelegramDeliveryService;
  private readonly vorcaro: VorcaroMessagingService;

  constructor(private readonly db: PrismaClient) {
    this.notifications = new PrismaNotificationRepository(db);
    this.preferences = new PrismaNotificationPreferenceRepository(db);
    this.telegram = new NotificationTelegramDeliveryService(db);
    this.vorcaro = new VorcaroMessagingService(db);
  }

  async runDailyDigestForUser(userId: string, referenceDate = new Date()): Promise<DigestRunStats> {
    const stats: DigestRunStats = {
      userId,
      dailyCreated: false,
      weeklyCreated: false,
      telegramSent: false,
    };

    const pref = await this.preferences.findByType(userId, "DAILY_DIGEST");
    if (!pref.digestEnabled) return stats;

    const since = new Date(referenceDate);
    since.setDate(since.getDate() - 1);

    const digestTypes: NotificationType[] = [
      "ALERT_CREATED",
      "RECEIVABLE_OVERDUE",
      "GOAL_AT_RISK",
      "MONEY_LEAK",
      "CASHFLOW_WARNING",
      "HIGH_COMMITMENT_MONTH",
      "DUPLICATE_SUBSCRIPTION",
      "RECOMMENDATION_CREATED",
    ];

    const items = await this.notifications.listForDigest(userId, since, digestTypes);
    const critical = items.filter((i) => i.severity === "CRITICAL");
    const overdue = items.filter((i) => i.type === "RECEIVABLE_OVERDUE");
    const goals = items.filter((i) => i.type === "GOAL_AT_RISK");
    const savings = items.filter((i) => i.type === "MONEY_LEAK");

    const header = await this.vorcaro.buildDigestHeader(userId, "daily");
    const lines = [
      header,
      "",
      `Alertas críticos: ${critical.length}`,
      ...critical.slice(0, 3).map((i) => `• ${i.title}`),
      "",
      `Recebíveis atrasados: ${overdue.length}`,
      ...overdue.slice(0, 3).map((i) => `• ${i.title}`),
      "",
      `Metas em risco: ${goals.length}`,
      ...goals.slice(0, 3).map((i) => `• ${i.title}`),
      "",
      `Economias identificadas: ${savings.length}`,
      ...savings.slice(0, 3).map((i) => `• ${i.title}`),
    ];

    const message = lines.join("\n");
    const dateKey = formatDateKey(referenceDate);
    const fp = buildDigestFingerprint(userId, "DAILY_DIGEST", dateKey);

    const dashboardFp = `${fp}:DASHBOARD`;
    const { created } = await this.notifications.create({
      userId,
      type: "DAILY_DIGEST",
      severity: critical.length > 0 ? "CRITICAL" : "INFO",
      title: "Resumo diário",
      message,
      channel: "DASHBOARD",
      fingerprint: dashboardFp,
      payload: { dateKey, itemCount: items.length },
      status: "SENT",
      sentAt: new Date(),
    });
    stats.dailyCreated = created;

    if (pref.telegramEnabled) {
      const telegramFp = `${fp}:TELEGRAM`;
      const { record, created: tgCreated } = await this.notifications.create({
        userId,
        type: "DAILY_DIGEST",
        severity: critical.length > 0 ? "CRITICAL" : "INFO",
        title: "Resumo diário",
        message,
        channel: "TELEGRAM",
        fingerprint: telegramFp,
        payload: { dateKey },
        status: "PENDING",
      });
      if (tgCreated) {
        stats.telegramSent = await this.telegram.deliver(record);
      }
    }

    return stats;
  }

  async runWeeklyDigestForUser(userId: string, referenceDate = new Date()): Promise<DigestRunStats> {
    const stats: DigestRunStats = {
      userId,
      dailyCreated: false,
      weeklyCreated: false,
      telegramSent: false,
    };

    const pref = await this.preferences.findByType(userId, "WEEKLY_DIGEST");
    if (!pref.digestEnabled) return stats;

    const since = new Date(referenceDate);
    since.setDate(since.getDate() - 7);

    const items = await this.notifications.listForDigest(userId, since, [
      "ALERT_CREATED",
      "RECEIVABLE_OVERDUE",
      "GOAL_AT_RISK",
      "MONEY_LEAK",
      "CASHFLOW_WARNING",
      "HIGH_COMMITMENT_MONTH",
      "RECOMMENDATION_CREATED",
      "DUPLICATE_SUBSCRIPTION",
    ]);

    const opportunities = items.filter((i) =>
      ["MONEY_LEAK", "DUPLICATE_SUBSCRIPTION", "RECOMMENDATION_CREATED"].includes(i.type),
    );
    const alerts = items.filter((i) => i.severity !== "INFO");

    const header = await this.vorcaro.buildDigestHeader(userId, "weekly");
    const lines = [
      header,
      "",
      `Principais alertas: ${alerts.length}`,
      ...alerts.slice(0, 5).map((i) => `• ${i.title}`),
      "",
      `Oportunidades / economia: ${opportunities.length}`,
      ...opportunities.slice(0, 5).map((i) => `• ${i.title}`),
      "",
      "Saldo da semana: consulte o dashboard executivo para detalhes.",
    ];

    const message = lines.join("\n");
    const wKey = weekKey(referenceDate);
    const fp = buildDigestFingerprint(userId, "WEEKLY_DIGEST", wKey);

    const { created } = await this.notifications.create({
      userId,
      type: "WEEKLY_DIGEST",
      severity: alerts.some((a) => a.severity === "CRITICAL") ? "CRITICAL" : "INFO",
      title: "Resumo semanal",
      message,
      channel: "DASHBOARD",
      fingerprint: `${fp}:DASHBOARD`,
      payload: { weekKey: wKey, itemCount: items.length },
      status: "SENT",
      sentAt: new Date(),
    });
    stats.weeklyCreated = created;

    if (pref.telegramEnabled) {
      const { record, created: tgCreated } = await this.notifications.create({
        userId,
        type: "WEEKLY_DIGEST",
        severity: "INFO",
        title: "Resumo semanal",
        message,
        channel: "TELEGRAM",
        fingerprint: `${fp}:TELEGRAM`,
        payload: { weekKey: wKey },
        status: "PENDING",
      });
      if (tgCreated) {
        stats.telegramSent = await this.telegram.deliver(record);
      }
    }

    return stats;
  }

  async runDailyForAllUsers(referenceDate = new Date()) {
    const users = await this.db.user.findMany({ select: { id: true } });
    const results: DigestRunStats[] = [];
    for (const { id } of users) {
      results.push(await this.runDailyDigestForUser(id, referenceDate));
    }
    return results;
  }

  async runWeeklyForAllUsers(referenceDate = new Date()) {
    const users = await this.db.user.findMany({ select: { id: true } });
    const results: DigestRunStats[] = [];
    for (const { id } of users) {
      results.push(await this.runWeeklyDigestForUser(id, referenceDate));
    }
    return results;
  }
}
