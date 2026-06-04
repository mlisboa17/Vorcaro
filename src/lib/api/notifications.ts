import { prisma } from "@/lib/prisma";
import { NotificationCenterService } from "@/modules/notifications/application/services/notification-center.service";
import { NotificationDigestService } from "@/modules/notifications/application/services/notification-digest.service";
import { NotificationEventBridgeService } from "@/modules/notifications/application/services/notification-event-bridge.service";
import { NotificationQueryService } from "@/modules/notifications/application/services/notification-query.service";
import { PrismaNotificationPreferenceRepository } from "@/modules/notifications/infrastructure/repositories/prisma-notification-preference.repository";

export function buildNotificationCenter() {
  return new NotificationCenterService(prisma);
}

export function buildNotificationQuery() {
  return new NotificationQueryService(prisma);
}

export function buildNotificationDigest() {
  return new NotificationDigestService(prisma);
}

export function buildNotificationEventBridge() {
  return new NotificationEventBridgeService(prisma);
}

export function buildNotificationPreferences() {
  return new PrismaNotificationPreferenceRepository(prisma);
}
