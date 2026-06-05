import { describe, expect, it, vi } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-a" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialInbox: {
      findMany: findManyMock,
    },
  },
}));

vi.mock("@/lib/inbox/handle-inbox-smart-batch-execute", () => ({
  handleInboxSmartBatchExecute: vi.fn(),
}));

describe("POST /api/inbox/intelligence/smart-batch/execute", () => {
  it("retorna 404 quando algum item pertence a outro usuário", async () => {
    findManyMock.mockResolvedValueOnce([{ id: "inbox-owned" }]);

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/inbox/intelligence/smart-batch/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxItemIds: ["inbox-owned", "inbox-other"] }),
      }),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Itens não encontrados");
    expect(body.unauthorizedIds).toBeUndefined();
  });
});
