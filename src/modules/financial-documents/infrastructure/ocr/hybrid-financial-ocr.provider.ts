import { PdfParseError } from "@/lib/parsers/pdf-parser";
import { parsePdf } from "@/lib/parsers/pdf-parser";
import type { FinancialOcrProvider } from "../../domain/ports/financial-ocr-provider.port";
import { sanitizeOcrText } from "../../domain/services/ocr-text-sanitizer";
import { BasicFinancialOcrProvider } from "./basic-financial-ocr.provider";
import type { PaddleOcrHttpProvider } from "./paddle-ocr-http.provider";

/** Texto mínimo em PDF nativo para não acionar OCR escaneado. */
export const MIN_NATIVE_PDF_TEXT_LENGTH = 30;

export class HybridFinancialOcrProvider implements FinancialOcrProvider {
  constructor(
    private readonly basic: BasicFinancialOcrProvider,
    private readonly paddle: PaddleOcrHttpProvider | null,
  ) {}

  async extract(input: {
    fileBuffer: Buffer;
    mimeType: string;
    pdfPassword?: string;
  }): Promise<{ text: string; raw?: unknown }> {
    const { fileBuffer, mimeType, pdfPassword } = input;

    if (mimeType === "application/pdf") {
      try {
        const nativeText = await parsePdf(fileBuffer, { pdfPassword });
        const cleaned = sanitizeOcrText(nativeText);
        if (cleaned.length >= MIN_NATIVE_PDF_TEXT_LENGTH) {
          return {
            text: cleaned,
            raw: { provider: "pdfjs", length: cleaned.length, fallback: false },
          };
        }
        if (this.paddle) {
          return this.extractWithPaddleFallback(input, "pdf-scanned");
        }
        return { text: cleaned, raw: { provider: "pdfjs", length: cleaned.length, fallback: false } };
      } catch (error) {
        if (error instanceof PdfParseError) {
          throw error;
        }
        if (this.paddle) {
          return this.extractWithPaddleFallback(input, "pdf-parse-error");
        }
        throw error;
      }
    }

    if (mimeType.startsWith("image/") && this.paddle) {
      return this.extractWithPaddleFallback(input, "image");
    }

    const basicResult = await this.basic.extract(input);
    const cleaned = sanitizeOcrText(basicResult.text);
    return {
      text: cleaned,
      raw: {
        ...(typeof basicResult.raw === "object" && basicResult.raw ? basicResult.raw : {}),
        fallback: true,
        ocr_fallback_used: true,
      },
    };
  }

  private async extractWithPaddleFallback(
    input: { fileBuffer: Buffer; mimeType: string; pdfPassword?: string },
    reason: string,
  ): Promise<{ text: string; raw?: unknown }> {
    if (!this.paddle) {
      return this.basic.extract(input);
    }
    try {
      const result = await this.paddle.extract(input);
      if (result.text.trim().length > 0) {
        return result;
      }
    } catch (error) {
      if (error instanceof PdfParseError) {
        throw error;
      }
      // serviço offline — fallback
    }

    const basicResult = await this.basic.extract(input);
    const cleaned = sanitizeOcrText(basicResult.text);
    return {
      text: cleaned,
      raw: {
        ...(typeof basicResult.raw === "object" && basicResult.raw ? basicResult.raw : {}),
        provider: "basic-fallback",
        fallback: true,
        ocr_fallback_used: true,
        paddle_attempt_reason: reason,
      },
    };
  }
}
