import type {
  NotificationChannel,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
} from "@/modules/notifications/domain/types/notification";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  status: NotificationStatus;
  title: string;
  message: string;
  channel: NotificationChannel;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
  actionUrl: string | null;
};

export type NotificationListResponse = {
  items: NotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type NotificationSummaryResponse = {
  unreadCount: number;
  byStatus: Record<NotificationStatus, number>;
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ALERT_CREATED: "Alerta financeiro",
  RECOMMENDATION_CREATED: "Recomendação do consultor",
  RECEIVABLE_OVERDUE: "Recebível atrasado",
  GOAL_AT_RISK: "Meta em risco",
  CASHFLOW_WARNING: "Alerta de fluxo de caixa",
  HIGH_COMMITMENT_MONTH: "Comprometimento elevado",
  DUPLICATE_SUBSCRIPTION: "Assinatura duplicada",
  MONEY_LEAK: "Vazamento de dinheiro",
  DAILY_DIGEST: "Resumo diário",
  WEEKLY_DIGEST: "Resumo semanal",
};

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  INFO: "Informação",
  WARNING: "Atenção",
  CRITICAL: "Crítico",
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pendente",
  SENT: "Enviada",
  READ: "Lida",
  DISMISSED: "Descartada",
  FAILED: "Falhou",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  DASHBOARD: "Dashboard",
  TELEGRAM: "Telegram",
  DIGEST: "Digest",
};
