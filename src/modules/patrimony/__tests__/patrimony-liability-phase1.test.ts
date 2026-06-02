import { describe, expect, it, vi } from "vitest";
import { LiabilityAmortizationService } from "../application/services/liability-amortization.service";
import {
  CreatePatrimonyLiabilityUseCase,
  DeletePatrimonyLiabilityUseCase,
  UpdatePatrimonyLiabilityUseCase,
} from "../application/use-cases/patrimony.use-cases";
import { PatrimonyError } from "../domain/errors/patrimony.error";
import type { PatrimonyLiabilityRepositoryPort } from "../domain/ports/patrimony.port";
import { buildLiabilityPaymentMetadata } from "@/lib/financial/liability-payment-metadata";

const userId = "user-1";

function buildLiability(overrides: Partial<ReturnType<typeof baseLiability>> = {}) {
  return { ...baseLiability(), ...overrides };
}

function baseLiability() {
  return {
    id: "liab-1",
    userId,
    nome: "Financiamento Corolla",
    descricao: null,
    tipo: "FINANCING" as const,
    saldoOriginal: 100_000,
    saldoAtual: 82_000,
    taxaJuros: null,
    dataContratacao: null,
    dataQuitacaoPrevista: null,
    estaAtivo: true,
    observacoes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildRepository(
  overrides: Partial<PatrimonyLiabilityRepositoryPort> = {},
): PatrimonyLiabilityRepositoryPort {
  return {
    listByUserId: vi.fn(),
    findByIdForUser: vi.fn().mockResolvedValue(buildLiability()),
    create: vi.fn().mockResolvedValue(buildLiability()),
    update: vi.fn().mockResolvedValue(buildLiability({ saldoAtual: 80_700 })),
    deleteById: vi.fn(),
    countUsage: vi.fn(),
    ...overrides,
  };
}

describe("patrimony liability phase 1", () => {
  it("cria passivo", async () => {
    const repository = buildRepository();
    const useCase = new CreatePatrimonyLiabilityUseCase(repository);

    await useCase.execute({
      userId,
      nome: "Financiamento Corolla",
      tipo: "FINANCING",
      saldoOriginal: 100_000,
      saldoAtual: 82_000,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        nome: "Financiamento Corolla",
        saldoOriginal: 100_000,
      }),
    );
  });

  it("edita passivo", async () => {
    const repository = buildRepository();
    const useCase = new UpdatePatrimonyLiabilityUseCase(repository);

    await useCase.execute("liab-1", userId, { saldoAtual: 80_000 });

    expect(repository.update).toHaveBeenCalledWith("liab-1", userId, { saldoAtual: 80_000 });
  });

  it("desativa passivo (soft delete)", async () => {
    const repository = buildRepository();
    const useCase = new DeletePatrimonyLiabilityUseCase(repository);

    const mode = await useCase.execute("liab-1", userId);

    expect(mode).toBe("soft");
    expect(repository.update).toHaveBeenCalledWith("liab-1", userId, { estaAtivo: false });
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("reduz saldo via amortização", async () => {
    const repository = buildRepository();
    const service = new LiabilityAmortizationService(repository);

    await service.applyAmortization({
      liabilityId: "liab-1",
      userId,
      metadata: buildLiabilityPaymentMetadata([{ tipo: "AMORTIZACAO", valor: 1300 }]),
    });

    expect(repository.update).toHaveBeenCalledWith("liab-1", userId, { saldoAtual: 80_700 });
  });

  it("não reduz saldo via juros no metadata", async () => {
    const repository = buildRepository();
    const service = new LiabilityAmortizationService(repository);

    await service.applyAmortization({
      liabilityId: "liab-1",
      userId,
      metadata: buildLiabilityPaymentMetadata([{ tipo: "JUROS", valor: 1300 }]),
    });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("ownership: passivo inexistente na amortização", async () => {
    const repository = buildRepository({
      findByIdForUser: vi.fn().mockResolvedValue(null),
    });
    const service = new LiabilityAmortizationService(repository);

    await expect(
      service.applyAmortization({
        liabilityId: "outro-user",
        userId,
        metadata: buildLiabilityPaymentMetadata([{ tipo: "AMORTIZACAO", valor: 100 }]),
      }),
    ).rejects.toBeInstanceOf(PatrimonyError);
  });

  it("ownership: passivo não encontrado na edição", async () => {
    const repository = buildRepository({
      update: vi.fn().mockResolvedValue(null),
    });
    const useCase = new UpdatePatrimonyLiabilityUseCase(repository);

    await expect(useCase.execute("missing", userId, { nome: "X" })).rejects.toBeInstanceOf(
      PatrimonyError,
    );
  });
});
