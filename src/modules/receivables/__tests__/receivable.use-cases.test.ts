import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ReceivableError } from "../domain/errors/receivable.error";
import type { ReceivableRecord, ReceivableRepositoryPort } from "../domain/ports/receivable.port";
import {
  CancelReceivableUseCase,
  CollectReceivableUseCase,
  CreateReceivableFromTransactionUseCase,
  CreateReceivableUseCase,
} from "../application/use-cases/receivable.use-cases";

function baseRecord(overrides: Partial<ReceivableRecord> = {}): ReceivableRecord {
  return {
    id: "recv-1",
    userId: "user-a",
    descricao: "Hotel viagem",
    devedorNome: "João",
    valorOriginal: 500,
    valorRecebido: 0,
    valorPendente: 500,
    status: "OPEN",
    origem: "TRANSACTION",
    observacoes: null,
    expectedDate: null,
    receivedAt: null,
    transactionId: "tx-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createRepoMock(overrides: Partial<ReceivableRepositoryPort> = {}): ReceivableRepositoryPort {
  return {
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    listByUserId: vi.fn(),
    update: vi.fn(),
    getSummary: vi.fn(),
    listOpenWithExpectedDateUntil: vi.fn(),
    ...overrides,
  };
}

describe("CreateReceivableUseCase", () => {
  it("valida campos obrigatórios", async () => {
    const useCase = new CreateReceivableUseCase(createRepoMock());
    await expect(
      (async () =>
        useCase.execute({
          userId: "user-a",
          descricao: "   ",
          devedorNome: "João",
          valorOriginal: 100,
        }))(),
    ).rejects.toBeInstanceOf(ReceivableError);
  });
});

describe("CreateReceivableFromTransactionUseCase", () => {
  it("rejeita transação de outro usuário (ownership)", async () => {
    const prisma = {
      transaction: { findFirst: vi.fn().mockResolvedValue(null) },
      receivable: { findFirst: vi.fn() },
    } as unknown as PrismaClient;

    const useCase = new CreateReceivableFromTransactionUseCase(prisma, createRepoMock());

    await expect(
      useCase.execute({
        userId: "user-a",
        transactionId: "tx-other",
        devedorNome: "João",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cria conta a receber e marca metadata da transação", async () => {
    const prisma = {
      transaction: {
        findFirst: vi.fn().mockResolvedValue({
          id: "tx-1",
          description: "Compra cartão",
          amount: new Decimal(500),
          metadata: {},
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      receivable: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    const repo = createRepoMock({
      create: vi.fn().mockResolvedValue(baseRecord()),
    });

    const useCase = new CreateReceivableFromTransactionUseCase(prisma, repo);
    const result = await useCase.execute({
      userId: "user-a",
      transactionId: "tx-1",
      devedorNome: "João",
    });

    expect(result.devedorNome).toBe("João");
    expect(prisma.transaction.update).toHaveBeenCalled();
    const updateArg = vi.mocked(prisma.transaction.update).mock.calls[0][0];
    expect(updateArg.data.metadata).toMatchObject({
      thirdPartyPurchase: true,
      receivableId: "recv-1",
    });
  });
});

describe("CollectReceivableUseCase", () => {
  it("registra recebimento parcial", async () => {
    const receivable = baseRecord();
    const repo = createRepoMock({
      findByIdForUser: vi
        .fn()
        .mockResolvedValueOnce(receivable)
        .mockResolvedValueOnce(
          baseRecord({
            valorRecebido: 200,
            valorPendente: 300,
            status: "PARTIALLY_RECEIVED",
          }),
        ),
    });

    const prisma = {
      financialAccount: {
        findFirst: vi.fn().mockResolvedValue({
          id: "acc-1",
          balance: new Decimal(1000),
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          transaction: { create: vi.fn().mockResolvedValue({ id: "income-1" }) },
          financialAccount: { update: vi.fn().mockResolvedValue({}) },
          receivable: {
            update: vi.fn().mockResolvedValue({
              id: "recv-1",
              valorRecebido: new Decimal(200),
              valorPendente: new Decimal(300),
              status: "PARTIALLY_RECEIVED",
              receivedAt: null,
            }),
          },
        };
        return fn(tx);
      }),
    } as unknown as PrismaClient;

    const useCase = new CollectReceivableUseCase(prisma, repo);
    const result = await useCase.execute({
      userId: "user-a",
      receivableId: "recv-1",
      amount: 200,
      accountId: "acc-1",
      date: new Date("2026-07-01"),
    });

    expect(result.receivable.status).toBe("PARTIALLY_RECEIVED");
    expect(result.receivable.valorPendente).toBe(300);
    expect(result.transactionId).toBe("income-1");
  });
});

describe("CancelReceivableUseCase", () => {
  it("cancela conta em aberto", async () => {
    const repo = createRepoMock({
      findByIdForUser: vi.fn().mockResolvedValue(baseRecord()),
      update: vi.fn().mockResolvedValue(
        baseRecord({ status: "CANCELLED", valorPendente: 0 }),
      ),
    });

    const useCase = new CancelReceivableUseCase(repo);
    const result = await useCase.execute("user-a", "recv-1");

    expect(result.status).toBe("CANCELLED");
    expect(result.valorPendente).toBe(0);
  });

  it("rejeita cancelamento de conta já recebida", async () => {
    const repo = createRepoMock({
      findByIdForUser: vi.fn().mockResolvedValue(
        baseRecord({ status: "RECEIVED", valorRecebido: 500, valorPendente: 0 }),
      ),
    });

    const useCase = new CancelReceivableUseCase(repo);
    await expect(useCase.execute("user-a", "recv-1")).rejects.toMatchObject({
      code: "BUSINESS_RULE",
    });
  });
});
