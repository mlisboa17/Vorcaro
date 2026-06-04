import type { NotificationChannel, NotificationType } from "../types/notification";

export function buildEventFingerprint(
  type: NotificationType,
  userId: string,
  entityKey: string,
): string {
  return `${type}:${userId}:${entityKey}`;
}

export function buildDeliveryFingerprint(
  type: NotificationType,
  userId: string,
  entityKey: string,
  channel: NotificationChannel,
): string {
  return `${buildEventFingerprint(type, userId, entityKey)}:${channel}`;
}

export function buildDigestFingerprint(
  userId: string,
  digestType: "DAILY_DIGEST" | "WEEKLY_DIGEST",
  dateKey: string,
): string {
  return `${digestType}:${userId}:${dateKey}`;
}
