import { describe, expect, it, vi } from "vitest";
import {
  isBradescoBankStatementText,
  parseBradescoBankStatementText,
} from "@/lib/inbox/bradesco-bank-statement-parser";
import { analyzeFinancialDocumentText } from "@/modules/financial-documents/domain/services/financial-document-import-analyzer.service";
import {
  buildInstallmentPurchaseFingerprint,
  extractInstallmentPurchasesFromText,
} from "@/modules/financial-documents/domain/services/card-invoice-installment-parser.service";
import { formatTelegramInstallmentBatchSummary } from "@/modules/financial-documents/application/services/telegram-document-summary.formatter";
import { FinancialDocumentLinesConfirmService } from "@/modules/financial-documents/application/services/financial-document-lines-confirm.service";

const BRADESCO_STATEMENT = `
Bradesco
Extrato de Conta Corrente
Saldo anterior R$ 1.000,00

Data Histórico Documento Débito Crédito Saldo
03/06/2026 PIX RECEBIDO João Silva 123456 0,00 500,00 1.500,00
04/06/2026 TED ENVIADA Empresa XYZ 987654 200,00 0,00 1.300,00
05/06/2026 TARIFA PACOTE SERVICOS 111222 15,90 0,00 1.284,10
`;

const CARD_INVOICE = `
Bradesco Cartões
Fatura do cartão
Valor total da fatura R$ 720,00

03/06 POSTO LISBOA C02/06 SAO PAULO 120,00
04/06 MERCADO CENTRAL C03/12 CURITIBA 89,90
04/06 LOJA ABC 01/03 250,00
`;

describe("Sprint 15.1.2 — extrato Bradesco", () => {
  it("identifica extrato bancário Bradesco", () => {
    expect(isBradescoBankStatementText(BRADESCO_STATEMENT)).toBe(true);
  });

  it("extrai débitos e créditos", () => {
    const lines = parseBradescoBankStatementText(BRADESCO_STATEMENT);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.some((l) => l.direction === "INCOME" && l.description.includes("PIX"))).toBe(true);
    expect(lines.some((l) => l.direction === "EXPENSE" && l.description.includes("TED"))).toBe(true);
  });

  it("gera múltiplas transações candidatas", () => {
    const analysis = analyzeFinancialDocumentText(BRADESCO_STATEMENT, { userId: "u1" });
    expect(analysis.documentKind).toBe("BANK_STATEMENT");
    expect(analysis.batchReviewRequired).toBe(true);
    expect(analysis.bankStatementTransactions.length).toBeGreaterThan(1);
  });
});

describe("Sprint 15.1.2 — fatura parcelada", () => {
  it("detecta compra parcelada 2/6", () => {
    const purchases = extractInstallmentPurchasesFromText("03/06 POSTO LISBOA C02/06 SAO PAULO 120,00");
    expect(purchases.length).toBe(1);
    expect(purchases[0]?.currentInstallment).toBe(2);
    expect(purchases[0]?.totalInstallments).toBe(6);
    expect(purchases[0]?.installmentAmount).toBe(120);
  });

  it("detecta múltiplas compras parceladas", () => {
    const analysis = analyzeFinancialDocumentText(CARD_INVOICE, { userId: "u1" });
    expect(analysis.documentKind).toBe("CARD_INVOICE");
    expect(analysis.installmentPurchases.length).toBeGreaterThanOrEqual(2);
  });

  it("fingerprint evita duplicidade", () => {
    const fp1 = buildInstallmentPurchaseFingerprint({
      userId: "u1",
      cardId: "c1",
      merchant: "Posto Lisboa",
      installmentAmount: 120,
      currentInstallment: 2,
      totalInstallments: 6,
    });
    const fp2 = buildInstallmentPurchaseFingerprint({
      userId: "u1",
      cardId: "c1",
      merchant: "Posto Lisboa",
      installmentAmount: 120,
      currentInstallment: 2,
      totalInstallments: 6,
    });
    expect(fp1).toBe(fp2);
  });
});

describe("Sprint 15.1.2 — Telegram", () => {
  it("orienta revisão no dashboard", () => {
    const text = formatTelegramInstallmentBatchSummary([
      { merchant: "Loja X", currentInstallment: 2, totalInstallments: 6, installmentAmount: 120 },
    ]);
    expect(text).toContain("compras parceladas");
    expect(text).toContain("Loja X");
    expect(text).toContain("2/6");
    expect(text).toContain("/dashboard/import/review");
  });
});

describe("Sprint 15.1.2 — confirmação humana", () => {
  it("cross-tenant retorna null", async () => {
    const service = new FinancialDocumentLinesConfirmService({} as never);
    (service as unknown as { repo: { findDocumentById: ReturnType<typeof vi.fn> } }).repo = {
      findDocumentById: vi.fn().mockResolvedValue(null),
    };
    const result = await service.getLines("user-a", "doc-1");
    expect(result).toBeNull();
  });

  it("exige seleção de linhas", async () => {
    const batchReview = analyzeFinancialDocumentText(BRADESCO_STATEMENT);
    const service = new FinancialDocumentLinesConfirmService({} as never);
    (service as unknown as {
      repo: {
        findDocumentById: ReturnType<typeof vi.fn>;
        updateSuggestion: ReturnType<typeof vi.fn>;
        updateDocument: ReturnType<typeof vi.fn>;
      };
      transactions: { save: ReturnType<typeof vi.fn> };
      audit: { record: ReturnType<typeof vi.fn> };
      getLines: ReturnType<typeof vi.fn>;
    }).repo = {
      findDocumentById: vi.fn().mockResolvedValue({
        id: "doc-1",
        status: "REVIEW_REQUIRED",
        suggestions: [{ id: "s1", metadata: { batchReview } }],
      }),
      updateSuggestion: vi.fn(),
      updateDocument: vi.fn(),
    };
    (service as unknown as { getLines: ReturnType<typeof vi.fn> }).getLines = vi
      .fn()
      .mockResolvedValue({ documentId: "doc-1", batchReview, suggestionId: "s1" });

    await expect(
      service.confirm("u1", "doc-1", { selectedLineIds: [] }),
    ).rejects.toThrow(/Selecione ao menos/);
  });
});
