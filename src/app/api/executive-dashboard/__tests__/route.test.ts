import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api/executive-dashboard", () => ({
  buildExecutiveDashboardService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { buildExecutiveDashboardService } from "@/lib/api/executive-dashboard";

describe("GET /api/executive-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 sem sessão autenticada", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("retorna payload consolidado para usuário autenticado", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-abc", email: "test@example.com" },
      expires: new Date().toISOString(),
    } as never);

    vi.mocked(buildExecutiveDashboardService).mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        cash: {
          saldoAtual: 5000,
          saldoProjetado30Dias: 4000,
          saldoProjetado90Dias: 3000,
          primeiraDataNegativa: null,
        },
        month: {
          receitas: 10000,
          despesasCaixa: 6000,
          despesasDre: 5500,
          saldoMes: 4000,
        },
        budget: {
          totalPlanejado: 8000,
          totalRealizadoDre: 5500,
          restante: 2500,
          categoriasEstouradas: 0,
          categoriasAtencao: 1,
        },
        patrimony: {
          totalAtivos: 100000,
          totalPassivos: 40000,
          patrimonioLiquido: 60000,
        },
        consortium: {
          consorciosAtivos: 1,
          creditoTotalConsorcio: 80000,
          valorPagoConsorcio: 20000,
        },
        alerts: [],
      }),
    } as unknown as ReturnType<typeof buildExecutiveDashboardService>);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.patrimony.patrimonioLiquido).toBe(
      body.patrimony.totalAtivos - body.patrimony.totalPassivos,
    );
    expect(body.cash.saldoAtual).toBe(5000);
  });
});
