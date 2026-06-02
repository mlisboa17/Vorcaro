import { describe, expect, it, vi } from "vitest";
import { ProcessRecurringTransactionsUseCase } from "../application/use-cases/process-recurring-transactions.use-case";
import type {
  RecurringTransactionRecord,
  RecurringTransactionRepositoryPort,
} from "../domain/ports/recurring-transaction.port";
import { parseDateOnlyToUtcNoon } from "../domain/services/calculate-next-recurring-date";
import type {
  CardRepositoryPort,
  PaymentMethodRepositoryPort,
} from "@/modules/transactions/domain/ports/ownership-validation.port";

const userId = "user-1";

function buildRecord(
  overrides: Partial<RecurringTransactionRecord> = {},
): RecurringTransactionRecord {
  return {
    id: "rec-1",
    userId,
    descricao: "Recorrente",
    tipo: "DESPESA",
    valor: 100,
    frequencia: "MENSAL",
    dataInicio: parseDateOnlyToUtcNoon("2026-01-05"),
    dataFim: null,
    proximaExecucao: parseDateOnlyToUtcNoon("2026-05-05"),
    estaAtivo: true,
    categoryId: "cat-1",
    financialAccountId: "acc-1",
    paymentMethodId: "pm-1",
    cardId: null,
    liabilityId: null,
    defaultAllocations: null,
    observacoes: null,
    diaInicioOriginal: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildRepository(
  recurring: RecurringTransactionRecord,
  options?: { alreadyGenerated?: boolean },
): RecurringTransactionRepositoryPort {
  return {
    listByUserId: vi.fn(),
    findByIdForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findDueActiveByUserId: vi.fn().mockResolvedValue([recurring]),
    hasGeneratedTransaction: vi.fn().mockResolvedValue(options?.alreadyGenerated ?? false),
    processOccurrence: vi.fn().mockResolvedValue({ transactionId: "tx-1" }),
    advanceNextExecution: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn(),
  };
}

function buildPaymentMethodRepo(type: "PIX" | "CARTAO"): PaymentMethodRepositoryPort {
  return {
    belongsToUser: vi.fn(),
    findActiveByIdForUser: vi.fn().mockResolvedValue({
      id: "pm-1",
      type,
      name: type,
    }),
  };
}

function buildCardRepo(): CardRepositoryPort {
  return {
    belongsToUser: vi.fn(),
    findBillingProfileById: vi.fn().mockResolvedValue({
      id: "card-1",
      closingDay: 5,
      dueDay: 12,
    }),
  };
}

function buildProcessUseCase(repository: RecurringTransactionRepositoryPort) {
  return new ProcessRecurringTransactionsUseCase(
    repository,
    buildPaymentMethodRepo("PIX"),
    buildCardRepo(),
    {
      findByIdForUser: vi.fn(),
      updateById: vi.fn(),
    } as never,
    {
      findByIdForUser: vi.fn(),
      update: vi.fn(),
    } as never,
  );
}

describe("ProcessRecurringTransactionsUseCase", () => {
  it("processa recorrência mensal criando transação", async () => {
    const recurring = buildRecord({ frequencia: "MENSAL" });
    const repository = buildRepository(recurring);
    const useCase = buildProcessUseCase(repository);

    const result = await useCase.execute(userId, parseDateOnlyToUtcNoon("2026-05-31"));

    expect(result).toEqual({ created: 1, skipped: 0, failed: 0 });
    expect(repository.processOccurrence).toHaveBeenCalledOnce();

    const call = vi.mocked(repository.processOccurrence).mock.calls[0][0];
    expect(call.executionDate.toISOString().slice(0, 10)).toBe("2026-05-05");
    expect(call.transactionInput.dataCaixa?.toISOString().slice(0, 10)).toBe("2026-05-05");
  });

  it("processa recorrência semanal", async () => {
    const recurring = buildRecord({
      frequencia: "SEMANAL",
      proximaExecucao: parseDateOnlyToUtcNoon("2026-05-04"),
      diaInicioOriginal: 4,
    });
    const repository = buildRepository(recurring);
    const useCase = buildProcessUseCase(repository);

    const result = await useCase.execute(userId, parseDateOnlyToUtcNoon("2026-05-10"));

    expect(result.created).toBe(1);
    expect(repository.processOccurrence).toHaveBeenCalledOnce();
  });

  it("processa recorrência quinzenal", async () => {
    const recurring = buildRecord({
      frequencia: "QUINZENAL",
      proximaExecucao: parseDateOnlyToUtcNoon("2026-05-06"),
      diaInicioOriginal: 6,
    });
    const repository = buildRepository(recurring);
    const useCase = buildProcessUseCase(repository);

    const result = await useCase.execute(userId, parseDateOnlyToUtcNoon("2026-05-20"));

    expect(result.created).toBe(1);
    expect(repository.processOccurrence).toHaveBeenCalledOnce();
  });

  it("não duplica mesma recorrência/data", async () => {
    const recurring = buildRecord();
    const repository = buildRepository(recurring, { alreadyGenerated: true });
    const useCase = buildProcessUseCase(repository);

    const result = await useCase.execute(userId, parseDateOnlyToUtcNoon("2026-05-31"));

    expect(result).toEqual({ created: 0, skipped: 1, failed: 0 });
    expect(repository.processOccurrence).not.toHaveBeenCalled();
    expect(repository.advanceNextExecution).toHaveBeenCalledOnce();
  });

  it("cartão calcula dataCaixa pela regra de fechamento/vencimento", async () => {
    const recurring = buildRecord({
      cardId: "card-1",
      proximaExecucao: parseDateOnlyToUtcNoon("2026-05-10"),
      diaInicioOriginal: 10,
    });
    const repository = buildRepository(recurring);
    const useCase = new ProcessRecurringTransactionsUseCase(
      repository,
      buildPaymentMethodRepo("CARTAO"),
      buildCardRepo(),
      {
        findByIdForUser: vi.fn(),
        updateById: vi.fn(),
      } as never,
      {
        findByIdForUser: vi.fn(),
        update: vi.fn(),
      } as never,
    );

    const result = await useCase.execute(userId, parseDateOnlyToUtcNoon("2026-05-31"));

    expect(result.created).toBe(1);

    const call = vi.mocked(repository.processOccurrence).mock.calls[0][0];
    expect(call.transactionInput.dataCaixa?.toISOString().slice(0, 10)).toBe("2026-07-12");
    expect(call.transactionInput.dataCaixa?.toISOString().slice(0, 10)).not.toBe("2026-05-10");
  });
});
