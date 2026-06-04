import { describe, expect, it } from "vitest";
import { NotificationCenterService } from "../application/services/notification-center.service";
import type { PrismaClient } from "@prisma/client";

describe("NotificationCenterService", () => {
  it("mapeia tipos de alerta financeiro para tipos de notificação", () => {
    const service = new NotificationCenterService({} as PrismaClient);
    expect(service.mapAlertType("OVERDUE_RECEIVABLE")).toBe("RECEIVABLE_OVERDUE");
    expect(service.mapAlertType("GOAL_AT_RISK")).toBe("GOAL_AT_RISK");
    expect(service.mapAlertType("CREDIT_CARD_RISK")).toBe("ALERT_CREATED");
  });
});
