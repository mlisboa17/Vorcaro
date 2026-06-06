import { describe, expect, it, vi } from "vitest";
import { PdfParseError } from "@/lib/parsers/pdf-parser";
import { explainDocumentConfidence } from "@/modules/financial-documents/domain/services/financial-document-confidence.service";
import { AUTO_APPROVAL_THRESHOLD } from "@/modules/financial-documents/domain/constants/financial-document-review.constants";
import { processingErrorUserMessage } from "@/modules/financial-documents/application/errors/financial-document-processing.error";
import { formatTelegramDocumentSummary } from "@/modules/financial-documents/application/services/telegram-document-summary.formatter";
import {
  diffSuggestionFields,
} from "@/modules/financial-documents/application/services/financial-document-audit.service";
import {
  FinancialDocumentSuggestionError,
  FinancialDocumentSuggestionService,
} from "@/modules/financial-documents/application/services/financial-document-suggestion.service";

describe("financial-document-confidence", () => {
  it("explica alta confiança com padrão aprendido", () => {
    const result = explainDocumentConfidence({
      confidence: 96,
      classification: {
        categoryId: "c1",
        subcategoryId: "s1",
        confidence: 96,
        isLearnedPattern: true,
        source: "learned_pix_key",
      },
      parsed: {
        method: "PIX",
        fields: { amount: 100, date: new Date("2026-06-04"), supplier: "Posto", pixKey: "a@b.com" },
        rawMatches: {},
      },
    });
    expect(result.reasons).toContain("Padrão aprendido");
    expect(result.requiresMandatoryReview).toBe(false);
  });

  it("exige revisão obrigatória abaixo do threshold", () => {
    const result = explainDocumentConfidence({
      confidence: 42,
      classification: {
        categoryId: null,
        subcategoryId: null,
        confidence: 42,
        isLearnedPattern: false,
        source: "pending",
      },
      parsed: {
        method: "TRANSFERENCIA",
        fields: { amount: 210.7 },
        rawMatches: {},
      },
      threshold: AUTO_APPROVAL_THRESHOLD,
    });
    expect(result.requiresMandatoryReview).toBe(true);
    expect(result.reasons).toContain("Fornecedor desconhecido");
  });
});

describe("financial-document-processing errors", () => {
  it("mensagens específicas por código", () => {
    expect(processingErrorUserMessage("PDF_PASSWORD_REQUIRED")).toBe("Documento protegido por senha.");
    expect(processingErrorUserMessage("OCR_EMPTY")).toBe("Não foi possível extrair informações suficientes.");
    expect(processingErrorUserMessage("CORRUPT_FILE")).toBe("Arquivo inválido ou corrompido.");
  });

  it("PdfParseError identifica senha", () => {
    const err = new PdfParseError("PDF_PASSWORD_REQUIRED");
    expect(err.code).toBe("PDF_PASSWORD_REQUIRED");
  });
});

describe("financial-document-audit diff", () => {
  it("registra campos alterados", () => {
    const diff = diffSuggestionFields(
      { amount: 10, supplier: "A" },
      { amount: 20, supplier: "A" },
      ["amount", "supplier"],
    );
    expect(diff.amount).toEqual({ before: 10, after: 20 });
    expect(diff.supplier).toBeUndefined();
  });
});

describe("FinancialDocumentSuggestionService low confidence", () => {
  it("bloqueia aprovação sem revisão explícita", async () => {
    const findSuggestionByIdMock = vi.fn().mockResolvedValue({
      id: "s1",
      userId: "u1",
      documentId: "d1",
      status: "PENDING",
      amount: 100,
      date: new Date("2026-06-04"),
      confidence: 40,
      categoryId: "c1",
      subcategoryId: null,
      description: "Test",
      supplier: "X",
      method: "PIX",
      metadata: { requiresMandatoryReview: true },
    });

    const mockPrisma = {
      financialAccount: { findFirst: vi.fn() },
    };

    const service = new FinancialDocumentSuggestionService(mockPrisma as never);
    (service as unknown as { repo: { findSuggestionById: typeof findSuggestionByIdMock } }).repo = {
      findSuggestionById: findSuggestionByIdMock,
    } as never;

    await expect(service.approve("u1", "s1")).rejects.toMatchObject({
      code: "LOW_CONFIDENCE_REVIEW_REQUIRED",
    });
  });

  it("permite aprovação após confirmação de revisão", async () => {
    const suggestion = {
      id: "s1",
      userId: "u1",
      documentId: "d1",
      status: "PENDING",
      amount: 100,
      date: new Date("2026-06-04"),
      confidence: 40,
      categoryId: "c1",
      subcategoryId: null,
      description: "Test",
      supplier: "X",
      method: "PIX",
      metadata: { requiresMandatoryReview: true },
    };

    const findSuggestionByIdMock = vi.fn().mockResolvedValue(suggestion);
    const updateSuggestionMock = vi.fn().mockResolvedValue(suggestion);
    const updateDocumentMock = vi.fn().mockResolvedValue({});
    const saveMock = vi.fn().mockResolvedValue({ id: "tx-1" });
    const recordMock = vi.fn().mockResolvedValue(undefined);
    const recordDecisionMock = vi.fn().mockResolvedValue(undefined);

    const mockPrisma = {
      financialAccount: {
        findFirst: vi.fn().mockResolvedValue({ id: "acc-1", userId: "u1", isActive: true }),
      },
    };

    const service = new FinancialDocumentSuggestionService(mockPrisma as never);
    Object.assign(service, {
      repo: {
        findSuggestionById: findSuggestionByIdMock,
        updateSuggestion: updateSuggestionMock,
        updateDocument: updateDocumentMock,
      },
      transactions: { save: saveMock },
      audit: { record: recordMock },
      learning: { recordDecision: recordDecisionMock },
    });

    const result = await service.approve("u1", "s1", { acknowledgedLowConfidence: true });
    expect(result.transactionId).toBe("tx-1");
    expect(saveMock).toHaveBeenCalled();
  });
});

describe("telegram document summary", () => {
  it("formata resumo completo", () => {
    const text = formatTelegramDocumentSummary({
      parsed: {
        method: "PIX",
        fields: { amount: 210.7, supplier: "Posto Lisboa" },
        rawMatches: {},
      },
      classification: {
        categoryId: "c1",
        subcategoryId: "s1",
        confidence: 98,
        isLearnedPattern: true,
        source: "learned_name",
      },
      categoryLabel: "Transporte → Combustível",
    });
    expect(text).toContain("📝 PIX identificado");
    expect(text).toContain("Quem recebeu:");
    expect(text).toContain("Posto Lisboa");
    expect(text).toContain("Transporte → Combustível");
    expect(text).toContain("98%");
  });
});

describe("FinancialDocumentSuggestionError", () => {
  it("expõe código LOW_CONFIDENCE_REVIEW_REQUIRED", () => {
    const err = new FinancialDocumentSuggestionError("test", "LOW_CONFIDENCE_REVIEW_REQUIRED");
    expect(err.code).toBe("LOW_CONFIDENCE_REVIEW_REQUIRED");
  });
});
