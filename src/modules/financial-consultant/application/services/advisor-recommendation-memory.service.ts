import type { DismissReason, PrismaClient } from "@prisma/client";
import { AdvisorRecommendationHashService } from "../../domain/services/advisor-recommendation-hash.service";
import { DISMISS_TTL_DAYS, HASH_PATTERN } from "../../domain/types/advisor-recommendation-state";
import type { AdvisorAction } from "../../domain/types/advisor-action";

export class AdvisorRecommendationForbiddenError extends Error {
  constructor() {
    super("Recomendação pertence a outro usuário");
    this.name = "AdvisorRecommendationForbiddenError";
  }
}

export class AdvisorRecommendationInvalidHashError extends Error {
  constructor() {
    super("Hash de recomendação inválido");
    this.name = "AdvisorRecommendationInvalidHashError";
  }
}

export class AdvisorRecommendationMemoryService {
  private readonly hashService = new AdvisorRecommendationHashService();

  constructor(private readonly prisma: PrismaClient) {}

  async filterVisibleActions(userId: string, actions: AdvisorAction[]): Promise<AdvisorAction[]> {
    if (actions.length === 0) return [];

    const hashes = actions.map((a) => a.recommendationHash);
    const now = new Date();

    const hidden = await this.prisma.advisorRecommendationState.findMany({
      where: {
        userId,
        recommendationHash: { in: hashes },
        status: "DISMISSED",
        dismissedUntil: { gt: now },
      },
      select: { recommendationHash: true },
    });

    const hiddenSet = new Set(hidden.map((h) => h.recommendationHash));
    return actions.filter((a) => !hiddenSet.has(a.recommendationHash));
  }

  async dismiss(
    userId: string,
    recommendationHash: string,
    dismissReason?: DismissReason,
    actionType = "UNKNOWN",
  ): Promise<void> {
    await this.assertCanMutate(userId, recommendationHash);

    const dismissedUntil = new Date();
    dismissedUntil.setUTCDate(dismissedUntil.getUTCDate() + DISMISS_TTL_DAYS);

    await this.prisma.advisorRecommendationState.upsert({
      where: {
        userId_recommendationHash: { userId, recommendationHash },
      },
      create: {
        userId,
        recommendationHash,
        actionType,
        status: "DISMISSED",
        dismissReason: dismissReason ?? null,
        dismissedUntil,
      },
      update: {
        actionType,
        status: "DISMISSED",
        dismissReason: dismissReason ?? null,
        dismissedUntil,
      },
    });
  }

  async click(userId: string, recommendationHash: string, actionType: string): Promise<void> {
    await this.assertCanMutate(userId, recommendationHash);

    const existing = await this.prisma.advisorRecommendationState.findUnique({
      where: { userId_recommendationHash: { userId, recommendationHash } },
    });

    const now = new Date();
    const keepDismissed = existing?.status === "DISMISSED";

    await this.prisma.advisorRecommendationState.upsert({
      where: {
        userId_recommendationHash: { userId, recommendationHash },
      },
      create: {
        userId,
        recommendationHash,
        actionType,
        status: "PENDING",
        clickCount: 1,
        clickedAt: now,
      },
      update: {
        actionType,
        clickCount: { increment: 1 },
        clickedAt: now,
        ...(keepDismissed
          ? {}
          : {
              status: "PENDING",
            }),
      },
    });
  }

  async reactivate(userId: string, recommendationHash: string): Promise<void> {
    await this.assertCanMutate(userId, recommendationHash);

    await this.prisma.advisorRecommendationState.upsert({
      where: {
        userId_recommendationHash: { userId, recommendationHash },
      },
      create: {
        userId,
        recommendationHash,
        actionType: "UNKNOWN",
        status: "PENDING",
        dismissedUntil: null,
        dismissReason: null,
      },
      update: {
        status: "PENDING",
        dismissedUntil: null,
        dismissReason: null,
      },
    });
  }

  /** Bloqueia hash válido já registrado para outro usuário (multi-tenant). */
  private async assertCanMutate(userId: string, recommendationHash: string): Promise<void> {
    const normalized = recommendationHash.trim().toLowerCase();
    if (!HASH_PATTERN.test(normalized)) {
      throw new AdvisorRecommendationInvalidHashError();
    }

    const foreign = await this.prisma.advisorRecommendationState.findFirst({
      where: {
        recommendationHash: normalized,
        userId: { not: userId },
      },
      select: { userId: true },
    });

    if (foreign) {
      throw new AdvisorRecommendationForbiddenError();
    }
  }

  isValidHash(hash: string): boolean {
    return this.hashService.isValidFormat(hash);
  }
}
