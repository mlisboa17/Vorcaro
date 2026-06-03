import type { PrismaClient } from "@prisma/client";
import { REVIEWABLE_STATUSES } from "@/types/inbox.constants";

export type InboxIntelligenceMetrics = {
  pendingReviewCount: number;
  learnedPatternsCount: number;
  suggestionsAcceptedEstimate: number;
  suggestionsCorrected: number;
  accuracyRatePercent: number | null;
  highConfidenceReadyCount: number;
  sourceUsage: {
    history: number;
    similarity: number;
    rule: number;
    ai: number;
  };
};

export class InboxIntelligenceMetricsService {
  constructor(private readonly db: PrismaClient) {}

  async getMetrics(userId: string): Promise<InboxIntelligenceMetrics> {
    const [pendingReviewCount, patterns, corrections, preferenceCount] = await Promise.all([
      this.db.financialInbox.count({
        where: { userId, status: { in: [...REVIEWABLE_STATUSES] } },
      }),
      this.db.userLearningPattern.findMany({
        where: { userId, patternType: "categorization_preference" },
        select: { occurrences: true, confidence: true },
      }),
      this.db.userLearningPattern.count({
        where: { userId, patternType: "classification_correction" },
      }),
      this.db.userLearningPattern.count({
        where: { userId, patternType: "categorization_preference" },
      }),
    ]);

    const learnedPatternsCount = patterns.length;
    const suggestionsAcceptedEstimate = patterns.reduce((sum, p) => sum + p.occurrences, 0);
    const suggestionsCorrected = corrections;

    const totalFeedback = suggestionsAcceptedEstimate + suggestionsCorrected;
    const accuracyRatePercent =
      totalFeedback > 0
        ? Math.round((suggestionsAcceptedEstimate / totalFeedback) * 100)
        : null;

    const ruleCount = await this.db.userRule.count({
      where: { userId, isActive: true },
    });

    return {
      pendingReviewCount,
      learnedPatternsCount,
      suggestionsAcceptedEstimate,
      suggestionsCorrected,
      accuracyRatePercent,
      highConfidenceReadyCount: 0,
      sourceUsage: {
        history: preferenceCount,
        similarity: Math.max(0, Math.floor(learnedPatternsCount * 0.3)),
        rule: ruleCount,
        ai: 0,
      },
    };
  }
}
