import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NotificationTelegramDeliveryService, TELEGRAM_RATE_LIMIT_PER_HOUR } from "../application/services/notification-telegram-delivery.service";

describe("NotificationTelegramDeliveryService", () => {
  it("respeita rate limit de 3 envios por hora", async () => {
    const db = {
      notification: {
        count: vi.fn().mockResolvedValue(TELEGRAM_RATE_LIMIT_PER_HOUR),
        updateMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    const service = new NotificationTelegramDeliveryService(db);
    expect(await service.canSend("user-1")).toBe(false);
  });

  it("permite envio abaixo do limite", async () => {
    const db = {
      notification: {
        count: vi.fn().mockResolvedValue(2),
        updateMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    const service = new NotificationTelegramDeliveryService(db);
    expect(await service.canSend("user-1")).toBe(true);
  });
});
