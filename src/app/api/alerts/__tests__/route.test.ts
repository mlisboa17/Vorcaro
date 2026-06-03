import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { GET as GET_SUMMARY } from "../summary/route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const listMock = vi.fn();
const summaryMock = vi.fn();

vi.mock("@/modules/financial-alerts/application/services/financial-alert-query.service", () => ({
  FinancialAlertQueryService: vi.fn().mockImplementation(() => ({
    list: listMock,
    summary: summaryMock,
  })),
}));

describe("GET /api/alerts", () => {
  beforeEach(() => {
    listMock.mockReset();
    summaryMock.mockReset();
  });

  it("retorna paginação padrão", async () => {
    listMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    const res = await GET(new Request("http://localhost/api/alerts"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(listMock).toHaveBeenCalledWith("user-1", 1, 20, expect.any(Object));
  });
});

describe("GET /api/alerts/summary", () => {
  it("retorna resumo consolidado", async () => {
    summaryMock.mockResolvedValue({
      totalOpen: 3,
      totalResolved: 10,
      totalCritical: 1,
      bySeverity: { INFO: 0, WARNING: 2, CRITICAL: 1 },
      byType: { CASHFLOW_WARNING: 1 },
    });

    const res = await GET_SUMMARY();
    const body = await res.json();

    expect(body.totalOpen).toBe(3);
    expect(body.totalCritical).toBe(1);
  });
});
