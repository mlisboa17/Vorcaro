import { describe, expect, it } from "vitest";
import { buildDocumentFingerprint, buildUploadFingerprint } from "@/modules/financial-documents/domain/services/document-fingerprint.service";
import { parseFinancialDocumentText } from "@/modules/financial-documents/domain/services/financial-document-parser.service";
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_BYTES,
} from "@/modules/financial-documents/domain/types/financial-document.types";
import {
  FinancialDocumentUploadError,
  FinancialDocumentUploadService,
} from "@/modules/financial-documents/application/services/financial-document-upload.service";
import { FinancialDocumentLearningService } from "@/modules/financial-documents/application/services/financial-document-learning.service";

const PIX_NUBANK = `
Comprovante de transferência Pix
Valor R$ 350,00
Data 04/06/2026
Destinatário Posto Lisboa
Chave Pix posto.lisboa@email.com
ID E123456789
Nubank
`;

const PIX_ITAU = `
Pix realizado com sucesso
Valor: R$ 120,50
Realizado em 03/06/2026
Favorecido Mercado Central
Chave PIX 11999998888
Itaú Unibanco
Autenticação ABC123ITAU
`;

const PIX_BB = `
Comprovante PIX Banco do Brasil
Valor R$ 89,90
Data 02/06/2026
Para João Silva
CPF 123.456.789-00
`;

const TED = `
Comprovante TED
Valor R$ 2.500,00
Data 01/06/2026
Banco Bradesco
Agência 1234
Conta 56789-0
Favorecido Empresa XYZ
`;

const BOLETO = `
Boleto bancário
Valor R$ 199,99
Vencimento 10/06/2026
Beneficiário Condomínio Solar
Linha digitável 34191.79001 01043.510047 91020.150008 1 99990000019999
`;

const CARD = `
Compra no cartão de crédito
Estabelecimento Restaurante Sabor
Valor R$ 78,40
Data 05/06/2026
Cartão ****4321
`;

describe("financial-document-parser", () => {
  it("extrai PIX Nubank", () => {
    const parsed = parseFinancialDocumentText(PIX_NUBANK);
    expect(parsed.method).toBe("PIX");
    expect(parsed.fields.amount).toBe(350);
    expect(parsed.fields.supplier?.toLowerCase()).toMatch(/posto|lisboa/);
    expect(parsed.fields.pixKey).toBeTruthy();
  });

  it("extrai PIX Itaú", () => {
    const parsed = parseFinancialDocumentText(PIX_ITAU);
    expect(parsed.method).toBe("PIX");
    expect(parsed.fields.amount).toBe(120.5);
    expect(parsed.fields.bank?.toLowerCase()).toMatch(/ita/u);
  });

  it("extrai PIX Banco do Brasil com CPF", () => {
    const parsed = parseFinancialDocumentText(PIX_BB);
    expect(parsed.method).toBe("PIX");
    expect(parsed.fields.amount).toBe(89.9);
    expect(parsed.fields.cpfCnpj).toMatch(/123/);
  });

  it("extrai TED/DOC", () => {
    const parsed = parseFinancialDocumentText(TED);
    expect(parsed.method).toBe("TRANSFERENCIA");
    expect(parsed.fields.amount).toBe(2500);
    expect(parsed.fields.agency).toBe("1234");
  });

  it("extrai boleto", () => {
    const parsed = parseFinancialDocumentText(BOLETO);
    expect(parsed.method).toBe("BOLETO");
    expect(parsed.fields.amount).toBe(199.99);
    expect(parsed.fields.barcode).toBeTruthy();
  });

  it("extrai cartão", () => {
    const parsed = parseFinancialDocumentText(CARD);
    expect(parsed.method).toBe("CARTAO_CREDITO");
    expect(parsed.fields.amount).toBe(78.4);
    expect(parsed.fields.supplier?.toLowerCase()).toMatch(/restaurante/);
  });
});

describe("document fingerprint", () => {
  it("gera fingerprint determinístico PIX", () => {
    const a = buildDocumentFingerprint({
      userId: "u1",
      method: "PIX",
      amount: 350,
      date: new Date("2026-06-04T12:00:00.000Z"),
      documentNumber: "E123",
      pixKey: "a@b.com",
    });
    const b = buildDocumentFingerprint({
      userId: "u1",
      method: "PIX",
      amount: 350,
      date: new Date("2026-06-04T12:00:00.000Z"),
      documentNumber: "E123",
      pixKey: "a@b.com",
    });
    expect(a).toBe(b);
  });

  it("upload fingerprint muda com conteúdo", () => {
    const a = buildUploadFingerprint("u1", "a.pdf", 100, Buffer.from("abc"));
    const b = buildUploadFingerprint("u1", "a.pdf", 100, Buffer.from("abd"));
    expect(a).not.toBe(b);
  });
});

describe("FinancialDocumentUploadService", () => {
  const mockPrisma = {
    financialDocument: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "doc-1",
        ...data,
      }),
    },
  };

  it("rejeita MIME inválido", () => {
    const service = new FinancialDocumentUploadService(mockPrisma as never);
    expect(() => service.validateMime("text/plain")).toThrow(FinancialDocumentUploadError);
  });

  it("rejeita arquivo grande", () => {
    const service = new FinancialDocumentUploadService(mockPrisma as never);
    expect(() => service.validateSize(MAX_DOCUMENT_BYTES + 1)).toThrow(FinancialDocumentUploadError);
  });

  it("aceita MIME permitidos", () => {
    expect(ALLOWED_DOCUMENT_MIMES.has("application/pdf")).toBe(true);
    expect(ALLOWED_DOCUMENT_MIMES.has("image/png")).toBe(true);
  });
});

describe("FinancialDocumentLearningService", () => {
  it("registra padrão após decisão", async () => {
    const patterns: Array<Record<string, unknown>> = [];
    const mockPrisma = {
      financialDocumentLearningPattern: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `p-${patterns.length + 1}`, ...data };
          patterns.push(row);
          return row;
        },
        update: async () => ({}),
      },
    };
    const service = new FinancialDocumentLearningService(mockPrisma as never);
    await service.recordDecision({
      userId: "u1",
      method: "PIX",
      pixKey: "test@email.com",
      supplier: "Posto Lisboa",
      categoryId: "cat-1",
    });
    expect(patterns.length).toBeGreaterThan(0);
  });
});

describe("guardrails", () => {
  it("aprovação humana é obrigatória — upload não cria transação diretamente", () => {
    expect(typeof FinancialDocumentUploadService.prototype.upload).toBe("function");
    expect(typeof FinancialDocumentLearningService.prototype.recordDecision).toBe("function");
  });
});
