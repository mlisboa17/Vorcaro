import { describe, expect, it, vi } from "vitest";

const isGroupForbiddenForUserMock = vi.hoisted(() => vi.fn());
const getGroupDetailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "session-user-id" } }),
}));

vi.mock("@/lib/api/installments", () => ({
  buildInstallmentReadModelService: () => ({
    isGroupForbiddenForUser: isGroupForbiddenForUserMock,
    getGroupDetail: getGroupDetailMock,
  }),
}));

describe("GET /api/installments/[groupId]", () => {
  it("retorna 404 para grupo de outro usuário", async () => {
    isGroupForbiddenForUserMock.mockResolvedValueOnce(true);
    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/installments/other-grp"), {
      params: Promise.resolve({ groupId: "other-grp" }),
    });
    expect(response.status).toBe(404);
    expect(getGroupDetailMock).not.toHaveBeenCalled();
  });

  it("retorna 404 para grupo inexistente", async () => {
    isGroupForbiddenForUserMock.mockResolvedValueOnce(false);
    getGroupDetailMock.mockResolvedValueOnce(null);
    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/installments/missing"), {
      params: Promise.resolve({ groupId: "missing" }),
    });
    expect(response.status).toBe(404);
  });

  it("retorna detalhe com parcelas ordenadas", async () => {
    isGroupForbiddenForUserMock.mockResolvedValueOnce(false);
    getGroupDetailMock.mockResolvedValueOnce({
      installmentGroup: "grp/with/slash",
      descricao: "Teste",
      valorTotal: 200,
      valorPago: 100,
      valorRestante: 100,
      totalParcelas: 2,
      parcelasPagas: 1,
      parcelasRestantes: 1,
      status: "ATIVO",
      transactions: [
        {
          id: "tx-1",
          description: "Teste",
          amount: 100,
          date: new Date().toISOString(),
          dataCaixa: null,
          dataVencimentoFatura: null,
          dataVencimento: "2026-07-01",
          numeroParcela: 1,
          totalParcelas: 2,
          category: null,
          card: null,
          status: "PAID",
        },
      ],
    });
    const { GET } = await import("../route");
    const encoded = encodeURIComponent("grp/with/slash");
    const response = await GET(new Request(`http://localhost/api/installments/${encoded}`), {
      params: Promise.resolve({ groupId: encoded }),
    });
    expect(response.status).toBe(200);
    expect(isGroupForbiddenForUserMock).toHaveBeenCalledWith("session-user-id", "grp/with/slash");
    expect(getGroupDetailMock).toHaveBeenCalledWith("session-user-id", "grp/with/slash");
  });
});
