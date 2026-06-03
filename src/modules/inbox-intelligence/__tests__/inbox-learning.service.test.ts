import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

const recordOrIncrement = vi.fn().mockResolvedValue(undefined);

vi.mock(
  "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository",
  () => ({
    PrismaUserLearningPatternRepository: class {
      recordOrIncrement = recordOrIncrement;
    },
  }),
);

import { InboxLearningService } from "../application/services/inbox-learning.service";

describe("InboxLearningService", () => {
  beforeEach(() => {
    recordOrIncrement.mockClear();
  });

  it("registra aceite quando categoria sugerida = escolhida", async () => {
    const create = vi.fn();
    const db = { userLearningPattern: { create } } as unknown as PrismaClient;

    const service = new InboxLearningService(db);
    const result = await service.recordCategoryFeedback({
      userId: "user-1",
      description: "OUTBACK TACARUNA SHOPP",
      suggestedCategoryId: "cat-rest",
      chosenCategoryId: "cat-rest",
      chosenCategoryName: "Restaurantes",
    });

    expect(result.accepted).toBe(true);
    expect(result.recorded).toBe(true);
    expect(recordOrIncrement).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        patternType: "categorization_preference",
        inputSignal: { keyword: "outback" },
      }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("registra correção quando usuário altera sugestão", async () => {
    const create = vi.fn().mockResolvedValue({});
    const db = { userLearningPattern: { create } } as unknown as PrismaClient;

    const service = new InboxLearningService(db);
    const result = await service.recordCategoryFeedback({
      userId: "user-1",
      description: "OUTBACK TACARUNA SHOPP",
      suggestedCategoryId: "cat-rest",
      chosenCategoryId: "cat-food",
      chosenCategoryName: "Alimentação",
    });

    expect(result.accepted).toBe(false);
    expect(result.recorded).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patternType: "classification_correction",
          userId: "user-1",
        }),
      }),
    );
  });
});
