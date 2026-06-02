import { describe, expect, it, vi } from "vitest";
import {
  CreatePatrimonyAssetUseCase,
  DeletePatrimonyAssetUseCase,
  GetPatrimonySummaryUseCase,
  UpdatePatrimonyAssetUseCase,
} from "../application/use-cases/patrimony.use-cases";
import { PatrimonyError } from "../domain/errors/patrimony.error";
import type {
  PatrimonyAssetRepositoryPort,
  PatrimonyLiabilityRepositoryPort,
  PatrimonyUnitOfWorkPort,
} from "../domain/ports/patrimony.port";

const userId = "user-asset-1";

function baseAsset() {
  return {
    id: "asset-1",
    userId,
    nome: "Corolla XEi",
    descricao: null,
    tipo: "VEHICLE" as const,
    valorAquisicao: 120000,
    valorAtual: 110000,
    dataAquisicao: new Date("2024-01-15T12:00:00.000Z"),
    estaAtivo: true,
    observacoes: null,
    linkedLiabilityId: "liab-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildAssetRepository(
  overrides: Partial<PatrimonyAssetRepositoryPort> = {},
): PatrimonyAssetRepositoryPort {
  return {
    listByUserId: vi.fn(),
    findByIdForUser: vi.fn().mockResolvedValue(baseAsset()),
    create: vi.fn().mockResolvedValue(baseAsset()),
    update: vi.fn().mockResolvedValue(baseAsset()),
    deleteById: vi.fn(),
    countUsage: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function buildLiabilityRepository(
  overrides: Partial<PatrimonyLiabilityRepositoryPort> = {},
): PatrimonyLiabilityRepositoryPort {
  return {
    listByUserId: vi.fn(),
    findByIdForUser: vi.fn().mockResolvedValue({
      id: "liab-1",
      userId,
      nome: "Financiamento Corolla",
      descricao: null,
      tipo: "FINANCING",
      saldoOriginal: 100000,
      saldoAtual: 82000,
      taxaJuros: null,
      dataContratacao: null,
      dataQuitacaoPrevista: null,
      estaAtivo: true,
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    create: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
    countUsage: vi.fn(),
    ...overrides,
  };
}

describe("patrimony asset sprint 1", () => {
  it("cria ativo com vínculo opcional de passivo", async () => {
    const assetRepo = buildAssetRepository();
    const liabilityRepo = buildLiabilityRepository();
    const useCase = new CreatePatrimonyAssetUseCase(assetRepo, liabilityRepo);

    await useCase.execute({
      userId,
      nome: "Apartamento",
      tipo: "REAL_ESTATE",
      valorAquisicao: 500000,
      linkedLiabilityId: "liab-1",
      dataAquisicao: null,
    });

    expect(liabilityRepo.findByIdForUser).toHaveBeenCalledWith("liab-1", userId);
    expect(assetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        linkedLiabilityId: "liab-1",
      }),
    );
  });

  it("rejeita vínculo de passivo sem ownership", async () => {
    const assetRepo = buildAssetRepository();
    const liabilityRepo = buildLiabilityRepository({
      findByIdForUser: vi.fn().mockResolvedValue(null),
    });
    const useCase = new UpdatePatrimonyAssetUseCase(assetRepo, liabilityRepo);

    await expect(
      useCase.execute("asset-1", userId, { linkedLiabilityId: "liab-outro-user" }),
    ).rejects.toBeInstanceOf(PatrimonyError);
  });

  it("DELETE faz soft delete e remove vínculo de passivo", async () => {
    const assetRepo = buildAssetRepository({
      update: vi.fn().mockResolvedValue(baseAsset()),
    });
    const useCase = new DeletePatrimonyAssetUseCase(assetRepo);

    const mode = await useCase.execute("asset-1", userId);

    expect(mode).toBe("soft");
    expect(assetRepo.update).toHaveBeenCalledWith("asset-1", userId, {
      estaAtivo: false,
      linkedLiabilityId: null,
    });
  });

  it("garante cálculo matemático do patrimônio líquido no summary", async () => {
    const unitOfWork: PatrimonyUnitOfWorkPort = {
      registerInvestmentTransaction: vi.fn(),
      registerFinancingPayment: vi.fn(),
      registerConsortiumParcel: vi.fn(),
      registerConsortiumContemplation: vi.fn(),
      registerAssetValuation: vi.fn(),
      getSummary: vi.fn().mockResolvedValue({
        totalAtivos: 788000,
        totalPassivos: 502000,
        patrimonioLiquido: 286000,
        ativosPorTipo: {} as never,
        passivosPorTipo: {} as never,
        evolucaoMensal: [],
      }),
    };

    const useCase = new GetPatrimonySummaryUseCase(unitOfWork);
    const summary = await useCase.execute(userId);
    expect(summary.patrimonioLiquido).toBe(summary.totalAtivos - summary.totalPassivos);
  });
});

