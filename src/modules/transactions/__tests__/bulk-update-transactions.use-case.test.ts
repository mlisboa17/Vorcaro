import { describe, expect, it, vi } from "vitest";
import { BulkUpdateTransactionsUseCase } from "../application/use-cases/bulk-update-transactions.use-case";
import { BulkUpdateTransactionsError } from "../application/errors/bulk-update-transactions.error";
import type { TransactionRepositoryPort } from "../domain/ports/transaction-repository.port";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "../domain/ports/ownership-validation.port";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";

const userId = "user-1";

function buildRepository(
  overrides: Partial<TransactionRepositoryPort> = {},
): TransactionRepositoryPort {
  return {
    findDuplicateInstallmentTransaction: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
    saveMany: vi.fn(),
    findByIdForUser: vi.fn(),
    findByIdWithRelationsForUser: vi.fn(),
    listByUserId: vi.fn(),
    listIdsByUserId: vi.fn(),
    countByIdsForUser: vi.fn().mockResolvedValue(1),
    bulkUpdateForUser: vi.fn().mockResolvedValue(1),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    ...overrides,
  };
}

function buildCategoryRepo(valid = true): CategoryRepositoryPort {
  return {
    belongsToUser: vi.fn().mockResolvedValue(valid),
  };
}

function buildAccountRepo(type = "CONTA_CORRENTE"): FinancialAccountRepositoryPort {
  return {
    belongsToUser: vi.fn(),
    findActiveByIdForUser: vi.fn().mockResolvedValue({
      id: "acc-1",
      type,
      name: "Conta",
    }),
  };
}

function buildPaymentRepo(type = "PIX"): PaymentMethodRepositoryPort {
  return {
    belongsToUser: vi.fn(),
    findActiveByIdForUser: vi.fn().mockResolvedValue({
      id: "pm-1",
      type,
      name: type,
    }),
  };
}

function buildCardRepo(valid = true): CardRepositoryPort {
  return {
    belongsToUser: vi.fn().mockResolvedValue(valid),
    findBillingProfileById: vi.fn(),
  };
}

function buildLiabilityRepo(valid = true): PatrimonyLiabilityRepositoryPort {
  return {
    listByUserId: vi.fn(),
    findByIdForUser: vi.fn().mockResolvedValue(valid ? { id: "liab-1" } : null),
    create: vi.fn(),
    update: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    softDelete: vi.fn(),
    countUsage: vi.fn(),
  } as unknown as PatrimonyLiabilityRepositoryPort;
}

function buildUseCase(repository: TransactionRepositoryPort) {
  return new BulkUpdateTransactionsUseCase(
    repository,
    buildCategoryRepo(),
    buildAccountRepo(),
    buildPaymentRepo(),
    buildCardRepo(),
    buildLiabilityRepo(),
  );
}

describe("BulkUpdateTransactionsUseCase", () => {
  it("altera categoria em lote", async () => {
    const repository = buildRepository({
      countByIdsForUser: vi.fn().mockResolvedValue(2),
      bulkUpdateForUser: vi.fn().mockResolvedValue(2),
    });
    const useCase = buildUseCase(repository);

    const result = await useCase.execute({
      userId,
      transactionIds: ["tx-1", "tx-2"],
      updates: { categoryId: "cat-food" },
    });

    expect(result.updatedCount).toBe(2);
    expect(repository.bulkUpdateForUser).toHaveBeenCalledWith(
      userId,
      ["tx-1", "tx-2"],
      { categoryId: "cat-food" },
      ["categoria"],
    );
  });

  it("altera dataCaixa em lote", async () => {
    const repository = buildRepository({
      countByIdsForUser: vi.fn().mockResolvedValue(1),
    });
    const useCase = buildUseCase(repository);

    await useCase.execute({
      userId,
      transactionIds: ["tx-1"],
      updates: { dataCaixa: "2026-06-10" },
    });

    expect(repository.bulkUpdateForUser).toHaveBeenCalledWith(
      userId,
      ["tx-1"],
      expect.objectContaining({
        dataCaixa: new Date("2026-06-10T12:00:00.000Z"),
      }),
      ["dataCaixa"],
    );
  });

  it("altera conta financeira em lote", async () => {
    const repository = buildRepository({
      countByIdsForUser: vi.fn().mockResolvedValue(1),
    });
    const useCase = buildUseCase(repository);

    await useCase.execute({
      userId,
      transactionIds: ["tx-1"],
      updates: { financialAccountId: "acc-1" },
    });

    expect(repository.bulkUpdateForUser).toHaveBeenCalledWith(
      userId,
      ["tx-1"],
      { accountId: "acc-1" },
      ["contaFinanceira"],
    );
  });

  it("altera cartão em lote quando informado", async () => {
    const repository = buildRepository({
      countByIdsForUser: vi.fn().mockResolvedValue(1),
    });
    const useCase = buildUseCase(repository);

    await useCase.execute({
      userId,
      transactionIds: ["tx-1"],
      updates: { cardId: "card-1" },
    });

    expect(repository.bulkUpdateForUser).toHaveBeenCalledWith(
      userId,
      ["tx-1"],
      { cardId: "card-1" },
      ["cartao"],
    );
  });

  it("rejeita quando ownership não confere", async () => {
    const repository = buildRepository({
      countByIdsForUser: vi.fn().mockResolvedValue(1),
    });
    const useCase = buildUseCase(repository);

    await expect(
      useCase.execute({
        userId,
        transactionIds: ["tx-1", "tx-2"],
        updates: { categoryId: "cat-1" },
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<BulkUpdateTransactionsError>);
  });

  it("rejeita categoria de outro usuário", async () => {
    const repository = buildRepository();
    const useCase = new BulkUpdateTransactionsUseCase(
      repository,
      buildCategoryRepo(false),
      buildAccountRepo(),
      buildPaymentRepo(),
      buildCardRepo(),
      buildLiabilityRepo(),
    );

    await expect(
      useCase.execute({
        userId,
        transactionIds: ["tx-1"],
        updates: { categoryId: "cat-invalid" },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("aplica atualização parcial apenas com campos informados", async () => {
    const repository = buildRepository();
    const useCase = buildUseCase(repository);

    await useCase.execute({
      userId,
      transactionIds: ["tx-1"],
      updates: { dataCompra: "2026-05-05" },
    });

    const patch = vi.mocked(repository.bulkUpdateForUser).mock.calls[0]?.[2];
    expect(patch).toEqual({
      dataCompra: new Date("2026-05-05T12:00:00.000Z"),
    });
    expect(Object.keys(patch ?? {})).toHaveLength(1);
  });

  it("suporta atualização de mais de 100 registros", async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `tx-${index}`);
    const repository = buildRepository({
      countByIdsForUser: vi.fn().mockResolvedValue(150),
      bulkUpdateForUser: vi.fn().mockResolvedValue(150),
    });
    const useCase = buildUseCase(repository);

    const result = await useCase.execute({
      userId,
      transactionIds: ids,
      updates: { categoryId: "cat-1" },
    });

    expect(result.updatedCount).toBe(150);
    expect(repository.bulkUpdateForUser).toHaveBeenCalledWith(
      userId,
      ids,
      { categoryId: "cat-1" },
      ["categoria"],
    );
  });
});
