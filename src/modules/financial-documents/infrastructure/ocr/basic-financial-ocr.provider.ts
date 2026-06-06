import { parsePdf, PdfParseError } from "@/lib/parsers/pdf-parser";
import type { FinancialOcrProvider } from "../../domain/ports/financial-ocr-provider.port";
import { sanitizeOcrText } from "../../domain/services/ocr-text-sanitizer";

export class BasicFinancialOcrProvider implements FinancialOcrProvider {
  async extract(input: {
    fileBuffer: Buffer;
    mimeType: string;
    pdfPassword?: string;
  }): Promise<{ text: string; raw?: unknown }> {
    const { fileBuffer, mimeType, pdfPassword } = input;

    if (mimeType === "application/pdf") {
      const text = await parsePdf(fileBuffer, { pdfPassword });
      const cleaned = sanitizeOcrText(text);
      return { text: cleaned, raw: { provider: "pdfjs", length: cleaned.length } };
    }

    if (mimeType.startsWith("image/")) {
      const printable = fileBuffer
        .toString("utf8")
        .replace(/[^\x20-\x7E\n\r\tÀ-ú]/g, " ")
        .trim();
      const cleaned = sanitizeOcrText(printable);
      if (cleaned.length >= 20) {
        return { text: cleaned, raw: { provider: "buffer-text-fallback" } };
      }
      return {
        text: "",
        raw: {
          provider: "image-placeholder",
          hint: "OCR de imagem requer serviço Paddle (OCR_PROVIDER=paddle).",
        },
      };
    }

    const text = sanitizeOcrText(fileBuffer.toString("utf8"));
    return { text, raw: { provider: text ? "raw-buffer" : "raw-buffer-empty" } };
  }
}

export { PdfParseError };
