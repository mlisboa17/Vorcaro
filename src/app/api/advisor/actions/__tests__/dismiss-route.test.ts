import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../[recommendationHash]/dismiss/route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const dismissMock = vi.fn();

vi.mock("@/lib/api/advisor-recommendation", () => ({
  buildAdvisorRecommendationMemoryService: () => ({
    isValidHash: (h: string) => /^[a-f0-9]{64}$/i.test(h),
    dismiss: dismissMock,
  }),
}));

describe("POST /api/advisor/actions/:hash/dismiss", () => {
  beforeEach(() => {
    dismissMock.mockReset();
    dismissMock.mockResolvedValue(undefined);
  });

  it("retorna 400 para hash malformado", async () => {
    const res = await POST(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ recommendationHash: "curto" }),
    });
    expect(res.status).toBe(400);
    expect(dismissMock).not.toHaveBeenCalled();
  });

  it("chama dismiss com hash válido", async () => {
    const hash = "e".repeat(64);
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissReason: "NOT_RELEVANT", actionType: "VIEW_ALERTS" }),
      }),
      { params: Promise.resolve({ recommendationHash: hash }) },
    );
    expect(res.status).toBe(200);
    expect(dismissMock).toHaveBeenCalledWith("user-1", hash, "NOT_RELEVANT", "VIEW_ALERTS");
  });
});
