import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PdfParseError } from "@/lib/parsers/pdf-parser";
import {
  containsBinaryOcrArtifacts,
  sanitizeOcrText,
} from "@/modules/financial-documents/domain/services/ocr-text-sanitizer";
import { BasicFinancialOcrProvider } from "@/modules/financial-documents/infrastructure/ocr/basic-financial-ocr.provider";
import {
  HybridFinancialOcrProvider,
  MIN_NATIVE_PDF_TEXT_LENGTH,
} from "@/modules/financial-documents/infrastructure/ocr/hybrid-financial-ocr.provider";
import { PaddleOcrHttpProvider } from "@/modules/financial-documents/infrastructure/ocr/paddle-ocr-http.provider";
import { createFinancialOcrProvider } from "@/modules/financial-documents/infrastructure/ocr/create-financial-ocr-provider";
import { FinancialDocumentOcrService } from "@/modules/financial-documents/application/services/financial-document-ocr.service";
import { formatTelegramDocumentSummary } from "@/modules/financial-documents/application/services/telegram-document-summary.formatter";

describe("ocr-text-sanitizer", () => {
  it("bloqueia artefatos JFIF/PNG/WEBP", () => {
    expect(containsBinaryOcrArtifacts("foo JFIF bar")).toBe(true);
    expect(containsBinaryOcrArtifacts("PNG header")).toBe(true);
    expect(containsBinaryOcrArtifacts("RIFF WEBP")).toBe(true);
    expect(sanitizeOcrText("Comprovante PIX R$ 10")).toBe("Comprovante PIX R$ 10");
    expect(sanitizeOcrText("JFIF garbage")).toBe("");
  });
});

describe("BasicFinancialOcrProvider", () => {
  it("não retorna bytes crus de JPEG como texto", async () => {
    const provider = new BasicFinancialOcrProvider();
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const result = await provider.extract({
      fileBuffer: jpegHeader,
      mimeType: "image/jpeg",
    });
    expect(result.text).toBe("");
    expect(containsBinaryOcrArtifacts(result.text)).toBe(false);
  });
});

describe("PaddleOcrHttpProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("extrai texto via POST /ocr", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "Comprovante Pix\nValor R$ 50,00",
        confidence: 87,
        provider: "paddleocr",
        pages: 1,
        raw: {},
      }),
    });

    const provider = new PaddleOcrHttpProvider("http://localhost:8008");
    const result = await provider.extract({
      fileBuffer: Buffer.from("fake-image"),
      mimeType: "image/png",
    });

    expect(result.text).toContain("Pix");
    expect((result.raw as { provider: string }).provider).toBe("paddleocr");
    expect((result.raw as { confidence: number }).confidence).toBe(87);
  });

  it("propaga PDF_PASSWORD_REQUIRED", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: { code: "PDF_PASSWORD_REQUIRED", message: "Documento protegido por senha." },
      }),
    });

    const provider = new PaddleOcrHttpProvider("http://localhost:8008");
    await expect(
      provider.extract({ fileBuffer: Buffer.from("%PDF"), mimeType: "application/pdf" }),
    ).rejects.toBeInstanceOf(PdfParseError);
  });
});

describe("HybridFinancialOcrProvider fallback", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("usa fallback basic quando serviço offline", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const basic = new BasicFinancialOcrProvider();
    const paddle = new PaddleOcrHttpProvider("http://localhost:8008");
    const hybrid = new HybridFinancialOcrProvider(basic, paddle);

    const pixText = `
Comprovante de transferência Pix
Valor R$ 350,00
Data 04/06/2026
Destinatário Posto Lisboa
`.trim();

    const result = await hybrid.extract({
      fileBuffer: Buffer.from(pixText, "utf8"),
      mimeType: "image/png",
    });

    expect(result.text).toContain("Pix");
    expect((result.raw as { ocr_fallback_used: boolean }).ocr_fallback_used).toBe(true);
  });
});

describe("createFinancialOcrProvider", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("retorna hybrid quando OCR_PROVIDER=paddle", () => {
    process.env.OCR_PROVIDER = "paddle";
    process.env.OCR_SERVICE_URL = "http://localhost:8008";
    const provider = createFinancialOcrProvider();
    expect(provider.constructor.name).toBe("HybridFinancialOcrProvider");
  });

  it("retorna basic quando OCR_PROVIDER ausente", () => {
    delete process.env.OCR_PROVIDER;
    const provider = createFinancialOcrProvider();
    expect(provider.constructor.name).toBe("BasicFinancialOcrProvider");
  });
});

describe("FinancialDocumentOcrService observability", () => {
  it("loga métricas de OCR", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new FinancialDocumentOcrService({
      extract: async () => ({
        text: "ok",
        raw: { provider: "paddleocr", confidence: 90 },
      }),
    });

    await service.extract(Buffer.from("x"), "image/png");
    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(payload.ocr_provider_used).toBe("paddleocr");
    expect(payload.ocr_confidence).toBe(90);
    logSpy.mockRestore();
  });
});

describe("Telegram com OCR real (formato)", () => {
  it("mantém resumo estruturado para imagem processada", () => {
    const summary = formatTelegramDocumentSummary({
      parsed: {
        method: "PIX",
        fields: { amount: 210.7, supplier: "Posto Lisboa" },
        rawMatches: {},
      },
      classification: {
        categoryId: "c1",
        subcategoryId: "s1",
        confidence: 85,
        isLearnedPattern: false,
        source: "system_rule",
      },
      categoryLabel: "Transporte → Combustível",
    });
    expect(summary).toContain("Posto Lisboa");
    expect(summary).toContain("85%");
  });
});

describe("MIN_NATIVE_PDF_TEXT_LENGTH", () => {
  it("threshold evita OCR desnecessário em PDFs nativos", () => {
    expect(MIN_NATIVE_PDF_TEXT_LENGTH).toBeGreaterThanOrEqual(20);
  });
});
