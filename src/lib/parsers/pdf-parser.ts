import { PdfParseError, toPdfParseError, isPasswordRelatedPdfError } from "./pdf-import-errors";

export interface PdfParseOptions {
  pdfPassword?: string;
}

type TextItem = { str?: string };

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

async function parseWithPdfParse(buffer: Buffer, pdfPassword?: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({
    data: buffer,
    ...(pdfPassword ? { password: pdfPassword } : {}),
  });
  const result = await parser.getText();
  return result.text || "";
}

async function parseWithPdfJs(buffer: Buffer, pdfPassword?: string): Promise<string> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: pdfPassword,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdfDoc = await loadingTask.promise;
  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        const textItem = item as TextItem;
        return typeof textItem.str === "string" ? textItem.str : "";
      })
      .join(" ");
    fullText += `${pageText}\n`;
  }

  await pdfDoc.destroy();
  return fullText;
}

/**
 * pdf-parse é o parser principal: puro JS, sem dependência nativa, funciona
 * de forma confiável em ambiente serverless (Vercel). pdfjs-dist entra como
 * fallback — ele depende opcionalmente de @napi-rs/canvas (binário nativo
 * indisponível na Vercel), então falha ali com frequência.
 */
export async function parsePdf(buffer: Buffer, options?: PdfParseOptions): Promise<string> {
  const hadPassword = Boolean(options?.pdfPassword?.trim());

  try {
    return await parseWithPdfParse(buffer, options?.pdfPassword);
  } catch (primaryError) {
    try {
      return await parseWithPdfJs(buffer, options?.pdfPassword);
    } catch (fallbackError) {
      if (isPasswordRelatedPdfError(primaryError)) {
        throw toPdfParseError(primaryError, hadPassword);
      }
      if (isPasswordRelatedPdfError(fallbackError)) {
        throw toPdfParseError(fallbackError, hadPassword);
      }
      throw toPdfParseError(primaryError, hadPassword);
    }
  }
}

export { PdfParseError };
