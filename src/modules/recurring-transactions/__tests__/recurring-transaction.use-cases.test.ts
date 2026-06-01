import { describe, expect, it, vi } from "vitest";
import {
  CreateRecurringTransactionUseCase,
  DeactivateRecurringTransactionUseCase,
  UpdateRecurringTransactionUseCase,
} from "../application/use-cases/recurring-transaction.use-cases";
import { RecurringTransactionError } from "../domain/errors/recurring-transaction.error";
import type {
  RecurringTransactionRecord,
  RecurringTransactionRepositoryPort,
} from "../domain/ports/recurring-transaction.port";
import { parseDateOnlyToUtcNoon } from "../domain/services/calculate-next-recurring-date";

const userId = "user-1";

function buildRecord(overrides: Partial<RecurringTransactionRecord> = {}): RecurringTransactionRecord {
  return {
    id: "rec-1",
    userId,
    descricao: "Internet mensal",
    tipo: "DESPESA",
    valor: 119.9,
    frequencia: "MENSAL",
    dataInicio: parseDateOnlyToUtcNoon("2026-01-10"),
    dataFim: null,
    proximaExecucao: parseDateOnlyToUtcNoon("2026-05-10"),
    estaAtivo: true,
    categoryId: "cat-1",
    financialAccountId: "acc-1",
    paymentMethodId: "pm-1",
    cardId: null,
    observacoes: null,
    diaInicioOriginal: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildOwnershipMocks() {
  return {
    categoryRepository: {
      belongsToUser: vi.fn().mockResolvedValue(true),
    },
    financialAccountRepository: {
      belongsToUser: vi.fn().mockResolvedValue(true),
      findActiveByIdForUser: vi.fn().mockResolvedValue({
        id: "acc-1",
        type: "CORRENTE",
        name: "Conta",
      }),
    },
    paymentMethodRepository: {
      belongsToUser: vi.fn().mockResolvedValue(true),
      findActiveByIdForUser: vi.fn().mockResolvedValue({
        id: "pm-1",
        type: "PIX",
        name: "PIX",
      }),
    },
    cardRepository: {
      belongsToUser: vi.fn().mockResolvedValue(true),
      findBillingProfileById: vi.fn(),
    },
  };
}

describe("recurring transaction use cases", () => {
  it("cria recorrência com ownership validado", async () => {
    const repository: RecurringTransactionRepositoryPort = {
      listByUserId: vi.fn(),
      findByIdForUser: vi.fn(),
      create: vi.fn().mockResolvedValue(buildRecord()),
      update: vi.fn(),
      findDueActiveByUserId: vi.fn(),
      hasGeneratedTransaction: vi.fn(),
      processOccurrence: vi.fn(),
      advanceNextExecution: vi.fn(),
      deactivate: vi.fn(),
    };

    const ownership = buildOwnershipMocks();
    const useCase = new CreateRecurringTransactionUseCase(
      repository,
      ownership.categoryRepository,
      ownership.financialAccountRepository,
      ownership.paymentMethodRepository,
      ownership.cardRepository,
    );

    const result = await useCase.execute({
      userId,
      descricao: "Internet mensal",
      tipo: "DESPESA",
      valor: 119.9,
      frequencia: "MENSAL",
      dataInicio: parseDateOnlyToUtcNoon("2026-01-10"),
      categoryId: "cat-1",
      financialAccountId: "acc-1",
      paymentMethodId: "pm-1",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        descricao: "Internet mensal",
        cardId: null,
      }),
    );
    expect(result.descricao).toBe("Internet mensal");
  });

  it("edita recorrência existente", async () => {
    const repository: RecurringTransactionRepositoryPort = {
      listByUserId: vi.fn(),
      findByIdForUser: vi.fn().mockResolvedValue(buildRecord()),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(buildRecord({ valor: 139.9 })),
      findDueActiveByUserId: vi.fn(),
      hasGeneratedTransaction: vi.fn(),
      processOccurrence: vi.fn(),
      advanceNextExecution: vi.fn(),
      deactivate: vi.fn(),
    };

    const ownership = buildOwnershipMocks();
    const useCase = new UpdateRecurringTransactionUseCase(
      repository,
      ownership.categoryRepository,
      ownership.financialAccountRepository,
      ownership.paymentMethodRepository,
      ownership.cardRepository,
    );

    const result = await useCase.execute({
      userId,
      id: "rec-1",
      valor: 139.9,
    });

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rec-1",
        valor: 139.9,
      }),
    );
    expect(result.valor).toBe(139.9);
  });

  it("soft delete desativa recorrência", async () => {
    const repository: RecurringTransactionRepositoryPort = {
      listByUserId: vi.fn(),
      findByIdForUser: vi.fn().mockResolvedValue(buildRecord()),
      create: vi.fn(),
      update: vi.fn(),
      findDueActiveByUserId: vi.fn(),
      hasGeneratedTransaction: vi.fn(),
      processOccurrence: vi.fn(),
      advanceNextExecution: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new DeactivateRecurringTransactionUseCase(repository);
    await useCase.execute(userId, "rec-1");

    expect(repository.deactivate).toHaveBeenCalledWith("rec-1", userId);
  });

  it("soft delete falha quando recorrência não existe", async () => {
    const repository: RecurringTransactionRepositoryPort = {
      listByUserId: vi.fn(),
      findByIdForUser: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      findDueActiveByUserId: vi.fn(),
      hasGeneratedTransaction: vi.fn(),
      processOccurrence: vi.fn(),
      advanceNextExecution: vi.fn(),
      deactivate: vi.fn(),
    };

    const useCase = new DeactivateRecurringTransactionUseCase(repository);

    await expect(useCase.execute(userId, "missing")).rejects.toBeInstanceOf(
      RecurringTransactionError,
    );
  });
});
