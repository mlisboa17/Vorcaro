export const NOTIFICATION_TYPES = [
  "ALERT_CREATED",
  "RECOMMENDATION_CREATED",
  "RECEIVABLE_OVERDUE",
  "GOAL_AT_RISK",
  "CASHFLOW_WARNING",
  "HIGH_COMMITMENT_MONTH",
  "DUPLICATE_SUBSCRIPTION",
  "MONEY_LEAK",
  "DAILY_DIGEST",
  "WEEKLY_DIGEST",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const NOTIFICATION_STATUSES = ["PENDING", "SENT", "READ", "DISMISSED", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["DASHBOARD", "TELEGRAM", "DIGEST"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Tipos elegíveis para envio imediato via Telegram (Sprint 10). */
export const TELEGRAM_IMMEDIATE_TYPES: readonly NotificationType[] = [
  "RECEIVABLE_OVERDUE",
  "CASHFLOW_WARNING",
  "GOAL_AT_RISK",
  "HIGH_COMMITMENT_MONTH",
];

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  status: NotificationStatus;
  title: string;
  message: string;
  channel: NotificationChannel;
  fingerprint: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
};

export type PublishNotificationInput = {
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  entityKey: string;
  payload?: Record<string, unknown> | null;
  actionUrl?: string | null;
};

export type NotificationPreferenceRecord = {
  id: string;
  userId: string;
  notificationType: NotificationType;
  dashboardEnabled: boolean;
  telegramEnabled: boolean;
  digestEnabled: boolean;
};
