import { describe, expect, it, vi } from "vitest";
import { ConfirmTransactionError } from "@/modules/financial-inbox/application/errors/confirm-transaction.error";

const executeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-a" } }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock(
  "@/modules/financial-inbox/application/use-cases/confirm-and-create-transaction.use-case",
  () => ({
    ConfirmAndCreateTransactionUseCase: vi.fn().mockImplementation(() => ({
      execute: executeMock,
    })),
  }),
);

vi.mock("@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository", () => ({
  PrismaInboxRepository: vi.fn(),
}));
vi.mock(
  "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository",
  () => ({
    PrismaExtractionResultRepository: vi.fn(),
  }),
);
vi.mock("@/modules/transactions/infrastructure/repositories/prisma-transaction.repository", () => ({
  PrismaTransactionRepository: vi.fn(),
}));
vi.mock("@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories", () => ({
  PrismaFinancialAccountRepository: vi.fn(),
  PrismaCategoryRepository: vi.fn(),
  PrismaPaymentMethodRepository: vi.fn(),
  PrismaCardOwnershipRepository: vi.fn(),
}));
vi.mock(
  "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository",
  () => ({
    PrismaUserLearningPatternRepository: vi.fn(),
  }),
);

describe("POST /api/inbox/[id]/confirm", () => {
  it("retorna 404 para item de outro usuário", async () => {
    executeMock.mockRejectedValueOnce(
      new ConfirmTransactionError("Inbox item not found", "NOT_FOUND"),
    );

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/inbox/inbox-other/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "inbox-other" }) },
    );

    expect(response.status).toBe(404);
  });
});
