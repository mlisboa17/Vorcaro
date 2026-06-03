import { describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    answer: "ok",
    provider: "groq",
    model: "test",
    confidence: "HIGH",
    usedSources: ["contas"],
  }),
);

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "session-user-id" } }),
}));

vi.mock("@/lib/api/financial-advisor", () => ({
  buildFinancialAdvisorService: () => ({
    ask: askMock,
  }),
}));

describe("POST /api/advisor/ask", () => {
  it("rejeita userId no body", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/advisor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "teste?", userId: "hacker" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("userId");
  });

  it("usa sessão para ask", async () => {
    askMock.mockClear();
    const { POST } = await import("../route");

    const response = await POST(
      new Request("http://localhost/api/advisor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Como está meu caixa?" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(askMock).toHaveBeenCalledWith("session-user-id", "Como está meu caixa?");
  });
});
