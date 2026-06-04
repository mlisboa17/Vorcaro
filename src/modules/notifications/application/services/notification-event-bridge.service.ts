import type { PrismaClient } from "@prisma/client";
import { NotificationCenterService } from "./notification-center.service";

/**
 * Ponte entre módulos de origem e a Central de Notificações.
 * Chamado após criação de alertas, recomendações e detecções.
 */
export class NotificationEventBridgeService {
  private readonly center: NotificationCenterService;

  constructor(db: PrismaClient) {
    this.center = new NotificationCenterService(db);
  }

  get centerService() {
    return this.center;
  }

  async onFinancialAlertCreated(input: Parameters<NotificationCenterService["publishFromAlert"]>[0]) {
    return this.center.publishFromAlert(input);
  }

  async onRecommendationCreated(input: {
    userId: string;
    recommendationHash: string;
    title: string;
    message: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    actionUrl?: string | null;
  }) {
    return this.center.publish({
      userId: input.userId,
      type: "RECOMMENDATION_CREATED",
      severity: input.severity ?? "INFO",
      title: input.title,
      message: input.message,
      entityKey: input.recommendationHash,
      actionUrl: input.actionUrl,
    });
  }

  async onMoneyLeakDetected(input: {
    userId: string;
    leakId: string;
    title: string;
    message: string;
    severity?: "WARNING" | "CRITICAL";
  }) {
    return this.center.publish({
      userId: input.userId,
      type: "MONEY_LEAK",
      severity: input.severity ?? "WARNING",
      title: input.title,
      message: input.message,
      entityKey: input.leakId,
    });
  }

  async onDuplicateSubscription(input: {
    userId: string;
    subscriptionKey: string;
    title: string;
    message: string;
  }) {
    return this.center.publish({
      userId: input.userId,
      type: "DUPLICATE_SUBSCRIPTION",
      severity: "WARNING",
      title: input.title,
      message: input.message,
      entityKey: input.subscriptionKey,
    });
  }
}
