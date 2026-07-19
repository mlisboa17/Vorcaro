import { extractText, getDocumentProxy } from "unpdf";
import { PdfParseError, toPdfParseError, isPasswordRelatedPdfError } from "./pdf-import-errors";

export interface PdfParseOptions {
  pdfPassword?: string;
}

/**
 * unpdf: build serverless do PDF.js, sem worker externo nem dependência de
 * canvas/DOMMatrix nativo — ao contrário de pdf-parse/pdfjs-dist "puros",
 * que dependem de arquivos (pdf.worker.mjs, @napi-rs/canvas) que o rastreador
 * de deploy da Vercel não inclui corretamente no bundle serverless.
 */
export async function parsePdf(buffer: Buffer, options?: PdfParseOptions): Promise<string> {
  const hadPassword = Boolean(options?.pdfPassword?.trim());

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer), {
      password: options?.pdfPassword,
    });
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch (error) {
    console.error(
      "[pdf-parser] unpdf failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    throw toPdfParseError(error, hadPassword);
  }
}

export { PdfParseError, isPasswordRelatedPdfError };
