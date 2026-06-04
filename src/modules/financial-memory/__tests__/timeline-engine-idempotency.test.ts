import { describe, expect, it, vi } from "vitest";
import { PrismaFinancialMemoryRepository } from "../infrastructure/repositories/prisma-financial-memory.repository";

describe("Timeline event idempotency", () => {
  it("não persiste quando fingerprint já existe", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "existing",
      userId: "USER123",
      eventType: "NET_WORTH_INCREASE",
      title: "T",
      description: "D",
      eventDate: new Date(),
      impactLevel: "MEDIUM",
      metadata: null,
      fingerprint: "USER123:NET_WORTH_INCREASE:2026-06",
      createdAt: new Date(),
    });
    const create = vi.fn();

    const repo = new PrismaFinancialMemoryRepository({
      financialTimelineEvent: { findUnique, create },
    } as never);

    const result = await repo.upsertTimelineEvent({
      userId: "USER123",
      eventType: "NET_WORTH_INCREASE",
      title: "Patrimônio em alta",
      description: "Teste",
      eventDate: new Date(),
      impactLevel: "MEDIUM",
      fingerprint: "USER123:NET_WORTH_INCREASE:2026-06",
    });

    expect(result.created).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("persiste na primeira ocorrência do fingerprint", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: "new",
      userId: "USER123",
      eventType: "GOAL_COMPLETED",
      title: "Meta",
      description: "Ok",
      eventDate: new Date(),
      impactLevel: "HIGH",
      metadata: null,
      fingerprint: "USER123:GOAL_COMPLETED:GOAL_ABC",
      createdAt: new Date(),
    });

    const repo = new PrismaFinancialMemoryRepository({
      financialTimelineEvent: { findUnique, create },
    } as never);

    const result = await repo.upsertTimelineEvent({
      userId: "USER123",
      eventType: "GOAL_COMPLETED",
      title: "Meta",
      description: "Ok",
      eventDate: new Date(),
      impactLevel: "HIGH",
      fingerprint: "USER123:GOAL_COMPLETED:GOAL_ABC",
    });

    expect(result.created).toBe(true);
    expect(create).toHaveBeenCalledOnce();
  });
});
