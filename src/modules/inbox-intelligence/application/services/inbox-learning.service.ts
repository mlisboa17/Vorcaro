import type { PrismaClient } from "@prisma/client";
import { extractLearningKeyword } from "@/modules/financial-inbox/domain/utils/learning-keyword";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";

export type CategoryFeedbackInput = {
  userId: string;
  description: string;
  suggestedCategoryId: string | null;
  chosenCategoryId: string;
  chosenCategoryName?: string | null;
};

export type CategoryFeedbackResult = {
  accepted: boolean;
  recorded: boolean;
};

export class InboxLearningService {
  private readonly patterns: PrismaUserLearningPatternRepository;

  constructor(private readonly db: PrismaClient) {
    this.patterns = new PrismaUserLearningPatternRepository(db);
  }

  async recordCategoryFeedback(input: CategoryFeedbackInput): Promise<CategoryFeedbackResult> {
    const accepted =
      input.suggestedCategoryId != null &&
      input.suggestedCategoryId === input.chosenCategoryId;

    const keyword = extractLearningKeyword(input.description);
    if (!keyword) {
      return { accepted, recorded: false };
    }

    await this.patterns.recordOrIncrement({
      userId: input.userId,
      patternType: "categorization_preference",
      inputSignal: { keyword },
      outputSignal: {
        categoryId: input.chosenCategoryId,
        category: input.chosenCategoryName ?? undefined,
        type: "EXPENSE",
      },
    });

    if (!accepted && input.suggestedCategoryId) {
      await this.db.userLearningPattern.create({
        data: {
          userId: input.userId,
          patternType: "classification_correction",
          inputSignal: { keyword, suggestedCategoryId: input.suggestedCategoryId },
          outputSignal: {
            categoryId: input.chosenCategoryId,
            category: input.chosenCategoryName ?? undefined,
          },
          confidence: 1,
          occurrences: 1,
        },
      });
    }

    return { accepted, recorded: true };
  }
}
