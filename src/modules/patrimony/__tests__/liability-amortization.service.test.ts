import { describe, expect, it, vi } from "vitest";
import { buildLiabilityPaymentMetadata } from "@/lib/financial/liability-payment-metadata";
import { LiabilityAmortizationService } from "../application/services/liability-amortization.service";
import type { PatrimonyLiabilityRepositoryPort } from "../domain/ports/patrimony.port";

const userId = "user-1";

function buildRepository(initialSaldo: number): PatrimonyLiabilityRepositoryPort {
  let saldoAtual = initialSaldo;

  return {
    listByUserId: vi.fn(),
    findByIdForUser: vi.fn().mockImplementation(async () => ({
      id: "liab-1",
      userId,
      nome: "Financiamento",
      saldoAtual,
    })),
    create: vi.fn(),
    update: vi.fn().mockImplementation(async (_id, _userId, input) => {
      if (input.saldoAtual !== undefined) {
        saldoAtual = input.saldoAtual;
      }

      return { id: "liab-1", saldoAtual };
    }),
    deleteById: vi.fn(),
    countUsage: vi.fn(),
  };
}

describe("LiabilityAmortizationService", () => {
  it("reverte amortização antiga antes de aplicar nova no sync", async () => {
    const repository = buildRepository(80_700);
    const service = new LiabilityAmortizationService(repository);

    const previousMetadata = buildLiabilityPaymentMetadata([
      { tipo: "AMORTIZACAO", valor: 1300 },
    ]);
    (previousMetadata as Record<string, unknown>).amortizacaoAplicada = 1300;

    await service.syncTransactionAmortization({
      userId,
      previousLiabilityId: "liab-1",
      previousMetadata,
      nextLiabilityId: "liab-1",
      nextMetadata: buildLiabilityPaymentMetadata([{ tipo: "AMORTIZACAO", valor: 500 }]),
    });

    expect(repository.update).toHaveBeenCalledTimes(2);
    expect(repository.update).toHaveBeenNthCalledWith(1, "liab-1", userId, {
      saldoAtual: 82_000,
    });
    expect(repository.update).toHaveBeenNthCalledWith(2, "liab-1", userId, {
      saldoAtual: 81_500,
    });
  });

  it("reverte ao remover vínculo com passivo", async () => {
    const repository = buildRepository(80_700);
    const service = new LiabilityAmortizationService(repository);

    const previousMetadata = buildLiabilityPaymentMetadata([
      { tipo: "AMORTIZACAO", valor: 1300 },
    ]);
    (previousMetadata as Record<string, unknown>).amortizacaoAplicada = 1300;

    await service.syncTransactionAmortization({
      userId,
      previousLiabilityId: "liab-1",
      previousMetadata,
      nextLiabilityId: null,
      nextMetadata: {},
    });

    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update).toHaveBeenCalledWith("liab-1", userId, { saldoAtual: 82_000 });
  });
});
