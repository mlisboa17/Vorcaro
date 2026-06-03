import { describe, expect, it, vi } from "vitest";

const getMonthlyMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    month: "2026-06",
    totalOutflows: 1000,
    totalInflows: 200,
    netCommitment: 800,
    commitmentsCount: 2,
    overdueCount: 0,
    next7DaysCount: 1,
    byOrigin: [],
    items: [],
  }),
);

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "session-user-id" } }),
}));

vi.mock("@/lib/api/monthly-commitments", () => ({
  buildMonthlyCommitmentsUseCases: () => ({
    getMonthly: getMonthlyMock,
  }),
}));

describe("GET /api/commitments/monthly", () => {
  it("retorna 401 sem sessão", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/commitments/monthly"));
    expect(response.status).toBe(401);
  });

  it("usa session.user.id e month param", async () => {
    getMonthlyMock.mockClear();
    const { GET } = await import("../route");
    const response = await GET(
      new Request("http://localhost/api/commitments/monthly?month=2026-06"),
    );
    expect(response.status).toBe(200);
    expect(getMonthlyMock).toHaveBeenCalledWith("session-user-id", "2026-06");
    const body = await response.json();
    expect(body.totalOutflows).toBe(1000);
  });

  it("retorna payload vazio quando sem compromissos", async () => {
    getMonthlyMock.mockResolvedValueOnce({
      month: "2026-06",
      totalOutflows: 0,
      totalInflows: 0,
      netCommitment: 0,
      commitmentsCount: 0,
      overdueCount: 0,
      next7DaysCount: 0,
      byOrigin: [],
      items: [],
    });
    const { GET } = await import("../route");
    const response = await GET(
      new Request("http://localhost/api/commitments/monthly?month=2026-06"),
    );
    const body = await response.json();
    expect(body.commitmentsCount).toBe(0);
  });
});
