import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaNotificationRepository } from "../infrastructure/repositories/prisma-notification.repository";

describe("PrismaNotificationRepository deduplication", () => {
  it("não duplica quando fingerprint já existe", async () => {
    const existing = {
      id: "n1",
      userId: "user-1",
      type: "GOAL_AT_RISK",
      severity: "WARNING",
      status: "SENT",
      title: "Meta",
      message: "msg",
      channel: "DASHBOARD",
      fingerprint: "GOAL_AT_RISK:user-1:goal-1:DASHBOARD",
      payload: null,
      createdAt: new Date(),
      sentAt: new Date(),
      readAt: null,
    };

    const db = {
      notification: {
        create: vi.fn().mockRejectedValue(new Error("Unique constraint failed")),
        findUnique: vi.fn().mockResolvedValue(existing),
      },
    } as unknown as PrismaClient;

    const repo = new PrismaNotificationRepository(db);
    const result = await repo.create({
      userId: "user-1",
      type: "GOAL_AT_RISK",
      severity: "WARNING",
      title: "Meta",
      message: "msg",
      channel: "DASHBOARD",
      fingerprint: "GOAL_AT_RISK:user-1:goal-1:DASHBOARD",
    });

    expect(result.created).toBe(false);
    expect(result.record.id).toBe("n1");
  });
});
