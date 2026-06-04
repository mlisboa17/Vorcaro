import type { PrismaClient } from "@prisma/client";
import { NotificationCenterService } from "@/modules/notifications/application/services/notification-center.service";
import { computeNextCheckAtAfterReminder } from "../../domain/services/vorcaro-followup-backoff";
import { VORCARO_FOLLOW_UP_MAX_REMINDERS } from "../../domain/types/vorcaro-followup";
import { PrismaVorcaroFollowUpRepository } from "../../infrastructure/repositories/prisma-vorcaro-followup.repository";

export type FollowUpSchedulerStats = {
  processed: number;
  reminded: number;
  expired: number;
  skipped: number;
  lockConflicts: number;
};

export class VorcaroFollowUpSchedulerService {
  private readonly repo: PrismaVorcaroFollowUpRepository;
  private readonly notifications: NotificationCenterService;

  constructor(private readonly db: PrismaClient) {
    this.repo = new PrismaVorcaroFollowUpRepository(db);
    this.notifications = new NotificationCenterService(db);
  }

  async run(now = new Date()): Promise<FollowUpSchedulerStats> {
    const stats: FollowUpSchedulerStats = {
      processed: 0,
      reminded: 0,
      expired: 0,
      skipped: 0,
      lockConflicts: 0,
    };

    const due = await this.repo.listDueActive(now);
    for (const followUp of due) {
      stats.processed += 1;

      const newCheckCount = followUp.checkCount + 1;
      const shouldExpire = newCheckCount >= VORCARO_FOLLOW_UP_MAX_REMINDERS;

      await this.notifications.publish({
        userId: followUp.userId,
        type: "RECOMMENDATION_CREATED",
        severity: "INFO",
        title: `Lembrete: ${followUp.title}`,
        message: followUp.description,
        entityKey: `followup:${followUp.id}:${newCheckCount}`,
        actionUrl: "/dashboard/vorcaro/followups",
        payload: {
          followUpId: followUp.id,
          checkCount: newCheckCount,
        },
      });
      stats.reminded += 1;

      const updated = await this.repo.updateWithVersion(
        followUp.id,
        followUp.userId,
        followUp.version,
        shouldExpire
          ? {
              status: "EXPIRED",
              checkCount: newCheckCount,
              lastReminderAt: now,
            }
          : {
              checkCount: newCheckCount,
              lastReminderAt: now,
              nextCheckAt: computeNextCheckAtAfterReminder(now, newCheckCount),
            },
      );

      if (!updated) {
        stats.lockConflicts += 1;
        continue;
      }

      if (shouldExpire) {
        stats.expired += 1;
      }
    }

    return stats;
  }
}
