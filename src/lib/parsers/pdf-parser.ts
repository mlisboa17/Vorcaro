import { PdfParseError, toPdfParseError } from "./pdf-import-errors";

export interface PdfParseOptions {
  pdfPassword?: string;
}

type TextItem = { str?: string };

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

export async function parsePdf(buffer: Buffer, options?: PdfParseOptions): Promise<string> {
  const data = new Uint8Array(buffer);
  const hadPassword = Boolean(options?.pdfPassword?.trim());

  try {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({
      data,
      password: options?.pdfPassword,
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
  } catch (error) {
    throw toPdfParseError(error, hadPassword);
  }
}

export { PdfParseError };
