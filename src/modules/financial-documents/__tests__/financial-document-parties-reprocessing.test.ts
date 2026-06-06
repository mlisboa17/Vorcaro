import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseFinancialDocumentText } from "@/modules/financial-documents/domain/services/financial-document-parser.service";
import { buildPartiesMetadata, displayPartyValue } from "@/modules/financial-documents/domain/services/financial-parties-metadata.service";
import { PARTIES_NOT_IDENTIFIED } from "@/modules/financial-documents/domain/types/financial-parties-metadata.types";
import { formatTelegramDocumentSummary } from "@/modules/financial-documents/application/services/telegram-document-summary.formatter";
import { enrichDocumentsHistory, enrichSuggestions } from "@/modules/financial-documents/application/services/financial-document-suggestion-presenter.service";
import { FinancialDocumentLearningService } from "@/modules/financial-documents/application/services/financial-document-learning.service";
import { FinancialDocumentClassificationService } from "@/modules/financial-documents/application/services/financial-document-classification.service";
import { FinancialDocumentReprocessService } from "@/modules/financial-documents/application/services/financial-document-reprocess.service";
import { FinancialDocumentProcessingService } from "@/modules/financial-documents/application/services/financial-document-processing.service";

describe("Sprint 15.1.1 — parties metadata", () => {
  it("extrai pagador e recebedor em PIX", () => {
    const text = `
      Comprovante PIX
      Pagador: Marcio de Lima
      CPF do pagador: 123.456.789-00
      Banco origem: Nubank
      Recebedor: Posto Lisboa
      CNPJ do recebedor: 12.345.678/0001-90
      Chave pix: posto@lisboa.com
      Valor: R$ 350,00
      Data: 04/06/2026
    `;
    const parsed = parseFinancialDocumentText(text);
    expect(parsed.method).toBe("PIX");
    expect(parsed.fields.payerName).toContain("Marcio");
    expect(parsed.fields.receiverName).toContain("Posto Lisboa");
    expect(parsed.fields.pixKey).toContain("posto@lisboa.com");
  });

  it("extrai apenas recebedor quando pagador ausente", () => {
    const text = `
      PIX
      Favorecido: Mercado Central
      Valor R$ 120,00
      04/06/2026
    `;
    const parsed = parseFinancialDocumentText(text);
    expect(parsed.fields.receiverName).toContain("Mercado Central");
    expect(parsed.fields.payerName).toBeUndefined();
    expect(displayPartyValue(parsed.fields.payerName)).toBe(PARTIES_NOT_IDENTIFIED);
  });

  it("extrai origem e destino em TED", () => {
    const text = `
      TED
      Remetente: Empresa Alpha
      Banco origem: Itaú
      Agência origem: 1234
      Conta origem: 56789-0
      Favorecido: Fornecedor Beta
      Banco destino: Bradesco
      Agência destino: 4321
      Conta destino: 98765-4
      Valor transferido R$ 2.500,00
      04/06/2026
    `;
    const parsed = parseFinancialDocumentText(text);
    expect(parsed.method).toBe("TRANSFERENCIA");
    expect(parsed.fields.payerName).toContain("Empresa Alpha");
    expect(parsed.fields.receiverName).toContain("Fornecedor Beta");
    expect(parsed.fields.payerBank).toContain("Itaú");
    expect(parsed.fields.receiverBank).toContain("Bradesco");
  });

  it("Telegram exibe pagador e recebedor", () => {
    const parsed = parseFinancialDocumentText(`
      PIX
      Pagador: Marcio de Lima
      Recebedor: Posto Lisboa
      Valor R$ 350,00
    `);
    const summary = formatTelegramDocumentSummary({
      parsed,
      classification: { categoryId: null, subcategoryId: null, confidence: 98, isLearnedPattern: false, source: "pending" },
      categoryLabel: "Combustível",
    });
    expect(summary).toContain("Quem pagou:");
    expect(summary).toContain("Marcio de Lima");
    expect(summary).toContain("Quem recebeu:");
    expect(summary).toContain("Posto Lisboa");
    expect(summary).toContain("Combustível");
  });

  it("Telegram usa Não identificado para campos ausentes", () => {
    const parsed = parseFinancialDocumentText("PIX\nValor R$ 10,00\nFavorecido: Loja X");
    const summary = formatTelegramDocumentSummary({
      parsed,
      classification: { categoryId: null, subcategoryId: null, confidence: 80, isLearnedPattern: false, source: "pending" },
    });
    expect(summary).toContain(PARTIES_NOT_IDENTIFIED);
  });
});

describe("Sprint 15.1.1 — presenter", () => {
  it("review/history expõem partes envolvidas", async () => {
    const prisma = {
      category: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as never;

    const enriched = await enrichSuggestions(prisma, "user-1", [
      {
        id: "sug-1",
        userId: "user-1",
        documentId: "doc-1",
        amount: 100,
        date: new Date("2026-06-04"),
        description: "Teste",
        supplier: "Posto",
        method: "PIX",
        categoryId: null,
        subcategoryId: null,
        confidence: 90,
        isLearnedPattern: false,
        status: "PENDING",
        metadata: {
          parties: {
            payerName: "Marcio",
            receiverName: "Posto",
            pixKey: "posto@x.com",
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        document: {
          id: "doc-1",
          fileName: "pix.pdf",
          status: "REVIEW_REQUIRED",
          extractedText: "ocr",
          extractedJson: {},
        },
      },
    ] as never);

    expect(enriched[0].parties.payerName).toBe("Marcio");
    expect(enriched[0].parties.receiverName).toBe("Posto");
    expect(enriched[0].parties.pixKey).toBe("posto@x.com");

    const history = await enrichDocumentsHistory(prisma, "user-1", [
      {
        id: "doc-1",
        fileName: "pix.pdf",
        status: "REVIEW_REQUIRED",
        method: "PIX",
        createdAt: new Date(),
        extractedJson: {
          parties: { payerName: "A", receiverName: "B", payerBank: "Nu", receiverBank: "Inter" },
        },
        suggestions: [
          {
            id: "sug-1",
            categoryId: null,
            subcategoryId: null,
            confidence: 80,
            isLearnedPattern: false,
            status: "PENDING",
            metadata: {},
          },
        ],
      },
    ] as never);

    expect(history[0].parties.payerName).toBe("A");
    expect(history[0].parties.receiverBank).toBe("Inter");
  });
});

describe("Sprint 15.1.1 — learning", () => {
  it("aprendizado usa pixKey e documentos", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const repo = {
      upsertLearningPattern: upsert,
    };
    const service = new FinancialDocumentLearningService({} as never);
    (service as unknown as { repo: typeof repo }).repo = repo;

    await service.recordDecision({
      userId: "u1",
      method: "PIX",
      pixKey: "abc@mail.com",
      payerDocument: "12345678900",
      receiverDocument: "98765432100",
      payerName: "Marcio",
      receiverName: "Posto",
      categoryId: "cat-1",
    });

    expect(upsert).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ pixKey: "abc@mail.com" }),
      expect.any(Object),
    );
    expect(upsert).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ documentNumber: "12345678900" }),
      expect.any(Object),
    );
    expect(upsert).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ documentNumber: "98765432100" }),
      expect.any(Object),
    );
  });

  it("classificação consulta documentos de pagador/recebedor", async () => {
    const findLearningPattern = vi.fn().mockResolvedValue(null);
    const prisma = {
      userRule: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new FinancialDocumentClassificationService(prisma as never);
    (service as unknown as { repo: { findLearningPattern: typeof findLearningPattern } }).repo = {
      findLearningPattern,
    };

    await service.classify("u1", {
      method: "PIX",
      fields: {
        amount: 10,
        payerDocument: "11122233344",
        receiverName: "Posto",
      },
      rawMatches: {},
    });

    expect(findLearningPattern).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ documentNumber: "11122233344" }),
    );
  });
});

describe("Sprint 15.1.1 — reprocessamento", () => {
  const auditRecord = vi.fn();
  const processMock = vi.fn();

  beforeEach(() => {
    auditRecord.mockReset();
    processMock.mockReset();
  });

  it("reprocessar FAILED registra auditoria e não retorna 404 para owner", async () => {
    const repo = {
      findDocumentById: vi.fn().mockResolvedValue({
        id: "doc-1",
        status: "FAILED",
        extractedJson: { processingError: { code: "OCR_EMPTY" } },
        suggestions: [{ id: "sug-1", status: "PENDING" }],
      }),
      updateDocument: vi.fn().mockResolvedValue({}),
    };

    const service = new FinancialDocumentReprocessService({} as never);
    (service as unknown as { repo: typeof repo; processing: { process: typeof processMock }; audit: { record: typeof auditRecord } }).repo = repo;
    (service as unknown as { processing: { process: typeof processMock } }).processing = { process: processMock };
    (service as unknown as { audit: { record: typeof auditRecord } }).audit = { record: auditRecord };

    processMock.mockResolvedValue({ documentId: "doc-1", status: "REVIEW_REQUIRED", suggestionId: "sug-1" });

    const result = await service.reprocess("user-1", "doc-1");
    expect(result?.status).toBe("REVIEW_REQUIRED");
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "REPROCESS_REQUESTED" }));
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "REPROCESS_SUCCEEDED" }));
    expect(processMock).toHaveBeenCalledWith("user-1", "doc-1", undefined);
  });

  it("reabrir REJECTED volta para REVIEW_REQUIRED", async () => {
    const repo = {
      findDocumentById: vi.fn().mockResolvedValue({
        id: "doc-1",
        status: "REJECTED",
        suggestions: [{ id: "sug-1", status: "REJECTED" }],
      }),
      updateDocument: vi.fn().mockResolvedValue({}),
      updateSuggestion: vi.fn().mockResolvedValue({}),
    };

    const service = new FinancialDocumentReprocessService({} as never);
    (service as unknown as { repo: typeof repo; audit: { record: typeof auditRecord } }).repo = repo;
    (service as unknown as { audit: { record: typeof auditRecord } }).audit = { record: auditRecord };

    const result = await service.reopen("user-1", "doc-1");
    expect(result?.status).toBe("REVIEW_REQUIRED");
    expect(repo.updateSuggestion).toHaveBeenCalledWith("sug-1", { status: "PENDING" });
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "REOPENED_AFTER_REJECTION" }));
  });

  it("cross-tenant retorna null (404 na rota)", async () => {
    const repo = {
      findDocumentById: vi.fn().mockResolvedValue(null),
    };
    const service = new FinancialDocumentReprocessService({} as never);
    (service as unknown as { repo: typeof repo }).repo = repo;
    const result = await service.reprocess("user-1", "doc-x");
    expect(result).toBeNull();
  });

  it("Transaction não recebe payer/receiver no approve", () => {
    const parties = buildPartiesMetadata({
      payerName: "Marcio",
      receiverName: "Posto",
      amount: 10,
    });
    const transactionMetadata = {
      financialDocumentId: "doc-1",
      source: "financial_document_import",
    };
    expect(transactionMetadata).not.toHaveProperty("payerName");
    expect(transactionMetadata).not.toHaveProperty("receiverName");
    expect(parties.payerName).toBe("Marcio");
  });

  it("reprocessamento atualiza sugestão existente via processing service", async () => {
    const updateSuggestion = vi.fn().mockResolvedValue({ id: "sug-1" });
    const createSuggestion = vi.fn();
    const service = new FinancialDocumentProcessingService({} as never);
    (service as unknown as {
      repo: {
        findDocumentById: ReturnType<typeof vi.fn>;
        updateDocument: ReturnType<typeof vi.fn>;
        updateSuggestion: typeof updateSuggestion;
        createSuggestion: typeof createSuggestion;
        findDocumentByFingerprint: ReturnType<typeof vi.fn>;
      };
      ocr: { extract: ReturnType<typeof vi.fn> };
      parser: { parseText: ReturnType<typeof vi.fn> };
      classification: { classify: ReturnType<typeof vi.fn> };
    }).repo = {
      findDocumentById: vi.fn().mockResolvedValue({
        id: "doc-1",
        mimeType: "application/pdf",
        fileName: "pix.pdf",
        extractedJson: { _storage: { base64: Buffer.from("x").toString("base64") } },
        suggestions: [{ id: "sug-1", status: "PENDING" }],
      }),
      updateDocument: vi.fn().mockResolvedValue({}),
      updateSuggestion,
      createSuggestion,
      findDocumentByFingerprint: vi.fn().mockResolvedValue(null),
    };
    (service as unknown as { ocr: { extract: ReturnType<typeof vi.fn> } }).ocr = {
      extract: vi.fn().mockResolvedValue({ text: "PIX\nPagador: A\nRecebedor: B\nValor R$ 10,00\n04/06/2026", raw: {} }),
    };
    (service as unknown as { parser: { parseText: ReturnType<typeof vi.fn> } }).parser = {
      parseText: vi.fn().mockReturnValue({
        method: "PIX",
        fields: { amount: 10, date: new Date("2026-06-04"), payerName: "A", receiverName: "B" },
        rawMatches: {},
      }),
    };
    (service as unknown as { classification: { classify: ReturnType<typeof vi.fn> } }).classification = {
      classify: vi.fn().mockResolvedValue({
        categoryId: null,
        subcategoryId: null,
        confidence: 80,
        isLearnedPattern: false,
        source: "pending",
      }),
    };

    const result = await service.process("user-1", "doc-1");
    expect(updateSuggestion).toHaveBeenCalled();
    expect(createSuggestion).not.toHaveBeenCalled();
    expect(result.status).toBe("REVIEW_REQUIRED");
  });
});
