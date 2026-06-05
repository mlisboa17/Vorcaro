import { describe, expect, it, vi } from "vitest";

const findByIdMock = vi.hoisted(() => vi.fn());
const findLatestByInboxItemIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-a" } }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository", () => ({
  PrismaInboxRepository: vi.fn().mockImplementation(() => ({
    findById: findByIdMock,
  })),
}));

vi.mock(
  "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository",
  () => ({
    PrismaExtractionResultRepository: vi.fn().mockImplementation(() => ({
      findLatestByInboxItemId: findLatestByInboxItemIdMock,
    })),
  }),
);

describe("GET /api/inbox/[id]", () => {
  it("retorna 404 para item de outro usuário", async () => {
    findByIdMock.mockResolvedValueOnce({
      id: "inbox-other",
      userId: "user-b",
      status: "READY",
    });

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/inbox/inbox-other"), {
      params: Promise.resolve({ id: "inbox-other" }),
    });

    expect(response.status).toBe(404);
    expect(findLatestByInboxItemIdMock).not.toHaveBeenCalled();
  });

  it("retorna 404 para item inexistente", async () => {
    findByIdMock.mockResolvedValueOnce(null);

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/inbox/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("retorna item do próprio usuário", async () => {
    const item = {
      id: "inbox-1",
      userId: "user-a",
      status: "READY",
      rawContent: "test",
    };
    findByIdMock.mockResolvedValueOnce(item);
    findLatestByInboxItemIdMock.mockResolvedValueOnce(null);

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/inbox/inbox-1"), {
      params: Promise.resolve({ id: "inbox-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.item).toEqual(item);
  });
});
