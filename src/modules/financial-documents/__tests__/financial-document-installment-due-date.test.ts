import { describe, expect, it, vi } from "vitest";
import { FinancialDocumentLinesConfirmService } from "@/modules/financial-documents/application/services/financial-document-lines-confirm.service";
import type { ExtractedInstallmentPurchase } from "@/modules/financial-documents/domain/types/financial-document-import.types";

type ConfirmServiceInternals = {
  prisma: {
    transaction: { findFirst: ReturnType<typeof vi.fn> };
    card: { findUnique: ReturnType<typeof vi.fn> };
  };
  transactions: { save: ReturnType<typeof vi.fn> };
};

function buildPurchase(overrides: Partial<ExtractedInstallmentPurchase> = {}): ExtractedInstallmentPurchase {
  return {
    id: "ip_1",
    merchant: "Notebook Loja XPTO",
    currentInstallment: 1,
    totalInstallments: 3,
    installmentAmount: 333.33,
    confidence: 90,
    ...overrides,
  };
}

describe("FinancialDocumentLinesConfirmService — âncora de vencimento de fatura", () => {
  it("usa o dueDate da fatura como âncora, independente do dia da compra", async () => {
    const service = new FinancialDocumentLinesConfirmService({} as never);
    const saveSpy = vi.fn().mockResolvedValue({ id: "tx-1" });

    (service as unknown as ConfirmServiceInternals).prisma = {
      transaction: { findFirst: vi.fn().mockResolvedValue(null) },
      card: { findUnique: vi.fn() },
    };
    (service as unknown as ConfirmServiceInternals).transactions = { save: saveSpy };

    const purchase = buildPurchase({
      purchaseDate: "2026-06-15", // compra no dia 15
      dueDate: "2026-06-10", // mas a fatura vence no dia 10
      currentInstallment: 1,
      totalInstallments: 3,
    });

    const result = await (
      service as unknown as {
        createFutureInstallments: (
          userId: string,
          input: { purchase: ExtractedInstallmentPurchase; documentId: string; accountId: string; cardId?: string },
        ) => Promise<{ created: number; skipped: number }>;
      }
    ).createFutureInstallments("user-1", {
      purchase,
      documentId: "doc-1",
      accountId: "acc-1",
    });

    expect(result.created).toBe(2); // parcelas 2/3 e 3/3
    expect(saveSpy).toHaveBeenCalledTimes(2);

    const firstCallDate = saveSpy.mock.calls[0]![0].date as Date;
    const secondCallDate = saveSpy.mock.calls[1]![0].date as Date;

    // Âncora é dia 10 (dueDate), não dia 15 (purchaseDate) — avança mês a mês preservando o dia 10.
    expect(firstCallDate.getUTCDate()).toBe(10);
    expect(firstCallDate.getUTCMonth()).toBe(6); // julho (0-indexed)
    expect(secondCallDate.getUTCDate()).toBe(10);
    expect(secondCallDate.getUTCMonth()).toBe(7); // agosto

    expect(saveSpy.mock.calls[0]![0].dataVencimentoFatura).toEqual(firstCallDate);
  });

  it("sem dueDate na fatura, usa o dueDay cadastrado do cartão como âncora", async () => {
    const service = new FinancialDocumentLinesConfirmService({} as never);
    const saveSpy = vi.fn().mockResolvedValue({ id: "tx-1" });
    const cardFindUnique = vi.fn().mockResolvedValue({ dueDay: 20 });

    (service as unknown as ConfirmServiceInternals).prisma = {
      transaction: { findFirst: vi.fn().mockResolvedValue(null) },
      card: { findUnique: cardFindUnique },
    };
    (service as unknown as ConfirmServiceInternals).transactions = { save: saveSpy };

    const purchase = buildPurchase({
      purchaseDate: "2026-06-05", // compra no dia 5
      currentInstallment: 1,
      totalInstallments: 2,
    });

    await (
      service as unknown as {
        createFutureInstallments: (
          userId: string,
          input: { purchase: ExtractedInstallmentPurchase; documentId: string; accountId: string; cardId?: string },
        ) => Promise<{ created: number; skipped: number }>;
      }
    ).createFutureInstallments("user-1", {
      purchase,
      documentId: "doc-1",
      accountId: "acc-1",
      cardId: "card-1",
    });

    expect(cardFindUnique).toHaveBeenCalledWith({
      where: { id: "card-1" },
      select: { dueDay: true },
    });

    const installmentDate = saveSpy.mock.calls[0]![0].date as Date;
    expect(installmentDate.getUTCDate()).toBe(20); // dueDay do cartão, não dia 5 da compra
  });

  it("conta como pulada (skipped) quando já existe transação com a mesma dedup key", async () => {
    const service = new FinancialDocumentLinesConfirmService({} as never);
    const saveSpy = vi.fn();

    (service as unknown as ConfirmServiceInternals).prisma = {
      transaction: { findFirst: vi.fn().mockResolvedValue({ id: "existing-tx" }) },
      card: { findUnique: vi.fn() },
    };
    (service as unknown as ConfirmServiceInternals).transactions = { save: saveSpy };

    const purchase = buildPurchase({
      dueDate: "2026-06-10",
      currentInstallment: 1,
      totalInstallments: 2,
    });

    const result = await (
      service as unknown as {
        createFutureInstallments: (
          userId: string,
          input: { purchase: ExtractedInstallmentPurchase; documentId: string; accountId: string; cardId?: string },
        ) => Promise<{ created: number; skipped: number }>;
      }
    ).createFutureInstallments("user-1", {
      purchase,
      documentId: "doc-1",
      accountId: "acc-1",
    });

    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
