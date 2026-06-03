import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancialPlanningService } from "../application/services/financial-planning.service";

const mockPrisma = {
  financialGoal: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/modules/cashflow/application/services/cashflow-projection.service", () => ({
  buildCashflowProjectionService: () => ({
    execute: vi.fn().mockResolvedValue({
      saldoAtual: 10000,
      previsao30Dias: 12000,
      previsao7Dias: 10500,
      previsao60Dias: 13000,
      previsao90Dias: 14000,
      previsao180Dias: 15000,
      previsao365Dias: 16000,
      primeiraDataNegativa: null,
      eventos: [],
      alertas: [],
    }),
  }),
}));

vi.mock("@/modules/patrimony/infrastructure/repositories/prisma-patrimony-unit-of-work", () => ({
  PrismaPatrimonyUnitOfWork: class {
    getSummary = vi.fn().mockResolvedValue({
      totalAtivos: 100000,
      totalPassivos: 40000,
      patrimonioLiquido: 60000,
    });
  },
}));

describe("FinancialPlanningService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita atualização quando meta não pertence ao usuário", async () => {
    mockPrisma.financialGoal.findFirst.mockResolvedValue(null);
    const service = new FinancialPlanningService(mockPrisma as never);

    await expect(
      service.updateGoal("user-a", "goal-1", { nome: "Teste" }),
    ).rejects.toThrow("GOAL_NOT_FOUND");
  });

  it("getGoals retorna quatro camadas por meta", async () => {
    mockPrisma.financialGoal.findMany.mockResolvedValue([
      {
        id: "g1",
        userId: "user-a",
        nome: "Reserva",
        descricao: null,
        tipo: "EMERGENCY_FUND",
        valorObjetivo: { toNumber: () => 6000, toFixed: () => "6000.00" },
        valorAtual: { toNumber: () => 1000, toFixed: () => "1000.00" },
        aporteMensal: { toNumber: () => 500, toFixed: () => "500.00" },
        dataObjetivo: null,
        prioridade: "HIGH",
        status: "ACTIVE",
        createdAt: new Date(),
      },
    ]);

    const service = new FinancialPlanningService(mockPrisma as never);
    const goals = await service.getGoals("user-a");

    expect(goals).toHaveLength(1);
    expect(goals[0].estrategia.percentualConcluido).toBeGreaterThan(0);
    expect(goals[0].viabilidade.risco).toBeDefined();
    expect(goals[0].recomendacao.mensagem.length).toBeGreaterThan(0);
    expect(goals[0].recomendacao.explicabilidade.length).toBeGreaterThan(0);
  });
});
