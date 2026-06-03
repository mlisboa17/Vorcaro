import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/inbox/handle-inbox-bulk-apply-suggestions", () => ({
  handleInboxBulkApplySuggestions: vi.fn().mockResolvedValue({
    applied: 2,
    skipped: 0,
    failed: 0,
    appliedIds: ["a", "b"],
    failedItems: [],
  }),
}));

vi.mock("@/lib/inbox/handle-inbox-bulk-confirm", () => ({
  handleInboxBulkConfirm: vi.fn().mockResolvedValue({
    confirmed: 2,
    skipped: 0,
    failed: 0,
    confirmedIds: ["a", "b"],
    failedItems: [],
  }),
}));

vi.mock("@/modules/inbox-intelligence/application/services/inbox-learning.service", () => ({
  InboxLearningService: class {
    recordCategoryFeedback = vi.fn().mockResolvedValue({ accepted: true, recorded: true });
  },
}));

vi.mock(
  "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository",
  () => ({
    PrismaExtractionResultRepository: class {
      findLatestByInboxItemId = vi.fn().mockResolvedValue({
        extractedData: {
          categoryId: "cat-1",
          category: "Alimentação → Restaurantes",
          inboxClassification: { categoryId: "cat-1", confidence: 96 },
        },
      });
    },
  }),
);

vi.mock("@/modules/inbox-intelligence/application/services/inbox-classification.service", () => ({
  InboxClassificationService: class {
    classify = vi.fn();
  },
}));

import { handleInboxSmartBatchExecute } from "../handle-inbox-smart-batch-execute";
import { handleInboxBulkApplySuggestions } from "@/lib/inbox/handle-inbox-bulk-apply-suggestions";
import { handleInboxBulkConfirm } from "@/lib/inbox/handle-inbox-bulk-confirm";

describe("handleInboxSmartBatchExecute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aplica sugestões, efetiva em lote e registra feedback", async () => {
    const db = {
      financialInbox: {
        findFirst: vi.fn().mockResolvedValue({ rawContent: "OUTBACK TACARUNA" }),
      },
    } as unknown as PrismaClient;

    const result = await handleInboxSmartBatchExecute(db, "user-1", ["a", "b"]);

    expect(handleInboxBulkApplySuggestions).toHaveBeenCalledWith(db, "user-1", ["a", "b"]);
    expect(handleInboxBulkConfirm).toHaveBeenCalledWith(db, "user-1", ["a", "b"]);
    expect(result.confirmed).toBe(2);
    expect(result.feedbackRecorded).toBe(2);
  });
});
