import { describe, expect, it, vi } from "vitest";
import type { FinancialExtraction } from "../domain/ports/ai-service.port";
import type { ExtractionResultRecord } from "../domain/ports/extraction-result-repository.port";
import type { InboxItemRecord } from "../domain/ports/inbox-repository.port";
import type { Transaction, TransactionInput } from "@/modules/transactions/domain/ports/transaction-repository.port";
import { ConfirmAndCreateTransactionUseCase } from "../application/use-cases/confirm-and-create-transaction.use-case";

vi.mock("@/modules/financial-inbox/application/validators/transaction-instrument.validator", () => ({
  validateTransactionInstruments: vi.fn().mockResolvedValue({
    categoryId: "cat-1",
    accountId: "acc-1",
    paymentMethodId: "pm-1",
    cardId: "card-1",
  }),
  TransactionInstrumentValidationError: class extends Error {},
}));

function buildExtraction(overrides: Partial<FinancialExtraction> = {}): FinancialExtraction {
  return {
    type: "EXPENSE",
    amount: 150,
    description: "FortlevEnergia 02/12",
    category: "Energia",
    date: "2026-01-15",
    paymentMethod: "Cartão",
    paymentMethodType: "CARTAO_CREDITO",
    financialInstitution: null,
    cardLastFourDigits: null,
    cardBrand: null,
    installments: 12,
    confidence: {},
    missingFields: [],
    followUpQuestion: null,
    financialAccountId: "acc-1",
    paymentMethodId: "pm-1",
    cardId: "card-1",
    categoryId: "cat-1",
    dataVencimentoFatura: "2026-02-10",
    ...overrides,
  };
}

describe("ConfirmAndCreateTransactionUseCase — parcelamentos", () => {
  it("popula campos estruturados ao confirmar item parcelado", async () => {
    const inboxItem: InboxItemRecord = {
      id: "inbox-1",
      userId: "user-1",
      status: "NEEDS_CONFIRMATION",
      rawContent: "FortlevEnergia 02/12",
      channel: "WEB_IMPORT",
      channelMeta: null,
      metadata: null,
      errorMessage: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const extraction: ExtractionResultRecord = {
      id: "ext-1",
      inboxItemId: "inbox-1",
      provider: "import",
      extractedData: buildExtraction(),
      confidence: { overall: 1, fields: {} },
      tokensUsed: null,
      processingMs: null,
      createdAt: new Date(),
    };

    let savedInput: TransactionInput | undefined;

    const useCase = new ConfirmAndCreateTransactionUseCase(
      {
        findById: vi.fn().mockResolvedValue(inboxItem),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        findLatestOrCreateFromImport: vi.fn().mockResolvedValue(extraction),
        findLatestByInboxItemId: vi.fn(),
        save: vi.fn(),
        updateExtractedData: vi.fn(),
      } as never,
      { findDuplicateInstallmentTransaction: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockImplementation(async (input: TransactionInput) => {
          savedInput = input;
          return { id: "tx-1", ...input } as Transaction;
        }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { recordOrIncrement: vi.fn() } as never,
    );

    await useCase.execute({
      inboxItemId: "inbox-1",
      userId: "user-1",
      corrections: {},
    });

    expect(savedInput).toBeDefined();
    expect(savedInput!.description).toBe("FortlevEnergia");
    expect(savedInput!.numeroParcela).toBe(2);
    expect(savedInput!.totalParcelas).toBe(12);
    expect(savedInput!.installmentGroup).toMatch(/^ig_/);
    expect(savedInput!.idGrupoParcelamento).toBe(savedInput!.installmentGroup);
    expect(savedInput!.dataVencimentoFatura).toEqual(new Date("2026-02-10T12:00:00.000Z"));
  });

  it("rejeita parcela duplicada", async () => {
    const inboxItem: InboxItemRecord = {
      id: "inbox-2",
      userId: "user-1",
      status: "NEEDS_CONFIRMATION",
      rawContent: "FortlevEnergia 02/12",
      channel: "WEB_IMPORT",
      channelMeta: null,
      metadata: null,
      errorMessage: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const useCase = new ConfirmAndCreateTransactionUseCase(
      {
        findById: vi.fn().mockResolvedValue(inboxItem),
        updateStatus: vi.fn(),
      } as never,
      {
        findLatestOrCreateFromImport: vi.fn().mockResolvedValue({
          id: "ext-1",
          inboxItemId: "inbox-2",
          provider: "import",
          extractedData: buildExtraction(),
          confidence: { overall: 1, fields: {} },
          tokensUsed: null,
          processingMs: null,
          createdAt: new Date(),
        }),
        findLatestByInboxItemId: vi.fn(),
        save: vi.fn(),
        updateExtractedData: vi.fn(),
      } as never,
      {
        findDuplicateInstallmentTransaction: vi.fn().mockResolvedValue({ id: "existing" } as Transaction),
        save: vi.fn(),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { recordOrIncrement: vi.fn() } as never,
    );

    await expect(
      useCase.execute({ inboxItemId: "inbox-2", userId: "user-1", corrections: {} }),
    ).rejects.toMatchObject({ code: "DUPLICATE" });
  });
});
