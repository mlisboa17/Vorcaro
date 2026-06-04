import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AdvisorRecommendationForbiddenError,
  AdvisorRecommendationInvalidHashError,
  AdvisorRecommendationMemoryService,
} from "../application/services/advisor-recommendation-memory.service";
import { mockAdvisorAction } from "./test-helpers";

function createPrismaMock() {
  const store: Array<{
    userId: string;
    recommendationHash: string;
    status: string;
    dismissedUntil: Date | null;
    clickCount: number;
    clickedAt: Date | null;
    actionType: string;
    dismissReason: string | null;
  }> = [];

  return {
    advisorRecommendationState: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const userId = where.userId as string;
        const hashes = (where.recommendationHash as { in: string[] })?.in ?? [];
        const now = new Date();
        return store
          .filter(
            (r) =>
              r.userId === userId &&
              hashes.includes(r.recommendationHash) &&
              r.status === "DISMISSED" &&
              r.dismissedUntil &&
              r.dismissedUntil > now,
          )
          .map((r) => ({ recommendationHash: r.recommendationHash }));
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const hash = where.recommendationHash as string;
        const notUserId = (where.userId as { not: string })?.not;
        return (
          store.find(
            (r) => r.recommendationHash === hash && r.userId !== notUserId,
          ) ?? null
        );
      }),
      findUnique: vi.fn(async ({ where }: { where: { userId_recommendationHash: { userId: string; recommendationHash: string } } }) => {
        const { userId, recommendationHash } = where.userId_recommendationHash;
        return store.find((r) => r.userId === userId && r.recommendationHash === recommendationHash) ?? null;
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId_recommendationHash: { userId: string; recommendationHash: string } };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const key = where.userId_recommendationHash;
          const idx = store.findIndex(
            (r) => r.userId === key.userId && r.recommendationHash === key.recommendationHash,
          );
          if (idx >= 0) {
            const prev = store[idx];
            const next = { ...prev, ...update };
            if (typeof update.clickCount === "object" && update.clickCount !== null) {
              next.clickCount = prev.clickCount + 1;
            }
            store[idx] = next as typeof prev;
            return store[idx];
          }
          const row = {
            userId: key.userId,
            recommendationHash: key.recommendationHash,
            status: String(create.status ?? "PENDING"),
            dismissedUntil: (create.dismissedUntil as Date | null) ?? null,
            clickCount: Number(create.clickCount ?? 0),
            clickedAt: (create.clickedAt as Date | null) ?? null,
            actionType: String(create.actionType ?? "UNKNOWN"),
            dismissReason: (create.dismissReason as string | null) ?? null,
          };
          store.push(row);
          return row;
        },
      ),
    },
    _store: store,
  };
}

describe("AdvisorRecommendationMemoryService", () => {
  const hash = "b".repeat(64);

  it("oculta ação com dismiss ativo e reaparece após expiração", async () => {
    const prisma = createPrismaMock();
    const service = new AdvisorRecommendationMemoryService(prisma as never);
    const action = mockAdvisorAction({ recommendationHash: hash });

    prisma._store.push({
      userId: "user-a",
      recommendationHash: hash,
      status: "DISMISSED",
      dismissedUntil: new Date(Date.now() + 86400000),
      clickCount: 0,
      clickedAt: null,
      actionType: "COLLECT_RECEIVABLE",
      dismissReason: "NOT_RELEVANT",
    });

    let visible = await service.filterVisibleActions("user-a", [action]);
    expect(visible).toHaveLength(0);

    prisma._store[0].dismissedUntil = new Date(Date.now() - 1000);
    visible = await service.filterVisibleActions("user-a", [action]);
    expect(visible).toHaveLength(1);
  });

  it("incrementa clickCount sem remover da listagem (status PENDING)", async () => {
    const prisma = createPrismaMock();
    const service = new AdvisorRecommendationMemoryService(prisma as never);

    await service.click("user-a", hash, "COLLECT_RECEIVABLE");
    await service.click("user-a", hash, "COLLECT_RECEIVABLE");

    const row = prisma._store[0];
    expect(row.clickCount).toBe(2);
    expect(row.clickedAt).toBeTruthy();
    expect(row.status).toBe("PENDING");

    const visible = await service.filterVisibleActions("user-a", [
      mockAdvisorAction({ recommendationHash: hash }),
    ]);
    expect(visible).toHaveLength(1);
  });

  it("rejeita hash malformado", async () => {
    const prisma = createPrismaMock();
    const service = new AdvisorRecommendationMemoryService(prisma as never);
    await expect(service.dismiss("user-a", "hash-curto")).rejects.toBeInstanceOf(
      AdvisorRecommendationInvalidHashError,
    );
  });

  it("bloqueia mutação cross-user quando hash pertence a outro usuário", async () => {
    const prisma = createPrismaMock();
    const service = new AdvisorRecommendationMemoryService(prisma as never);

    prisma._store.push({
      userId: "user-b",
      recommendationHash: hash,
      status: "PENDING",
      dismissedUntil: null,
      clickCount: 0,
      clickedAt: null,
      actionType: "COLLECT_RECEIVABLE",
      dismissReason: null,
    });

    await expect(service.dismiss("user-a", hash)).rejects.toBeInstanceOf(
      AdvisorRecommendationForbiddenError,
    );
  });
});
