import { PdfParseError } from "@/lib/parsers/pdf-parser";
import type { FinancialOcrProvider } from "../../domain/ports/financial-ocr-provider.port";
import { sanitizeOcrText } from "../../domain/services/ocr-text-sanitizer";

export type PaddleOcrResponse = {
  text: string;
  confidence: number;
  provider: string;
  pages: number;
  raw?: Record<string, unknown>;
};

export class PaddleOcrHttpProvider implements FinancialOcrProvider {
  constructor(
    private readonly serviceUrl: string,
    private readonly timeoutMs = 120_000,
  ) {}

  async extract(input: {
    fileBuffer: Buffer;
    mimeType: string;
    pdfPassword?: string;
  }): Promise<{ text: string; raw?: unknown }> {
    const url = `${this.serviceUrl.replace(/\/$/, "")}/ocr`;
    const form = new FormData();
    const blob = new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType });
    const ext = input.mimeType === "application/pdf" ? "pdf" : input.mimeType.split("/")[1] ?? "bin";
    form.append("file", blob, `document.${ext}`);
    if (input.pdfPassword) {
      form.append("password", input.pdfPassword);
    }

    const response = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const body = (await response.json().catch(() => null)) as
      | PaddleOcrResponse
      | { detail?: string | { code?: string; message?: string } }
      | null;

    if (!response.ok) {
      const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
      if (typeof detail === "object" && detail?.code === "PDF_PASSWORD_REQUIRED") {
        throw new PdfParseError("PDF_PASSWORD_REQUIRED");
      }
      if (typeof detail === "object" && detail?.code === "PDF_INVALID_PASSWORD") {
        throw new PdfParseError("PDF_INVALID_PASSWORD");
      }
      throw new Error(
        typeof detail === "string"
          ? detail
          : typeof detail === "object" && detail?.message
            ? detail.message
            : `OCR service HTTP ${response.status}`,
      );
    }

    const parsed = body as PaddleOcrResponse;
    const text = sanitizeOcrText(parsed.text ?? "");

    return {
      text,
      raw: {
        provider: "paddleocr",
        confidence: parsed.confidence ?? 0,
        pages: parsed.pages ?? 1,
        ocrServiceRaw: parsed.raw ?? {},
        fallback: false,
      },
    };
  }
}
