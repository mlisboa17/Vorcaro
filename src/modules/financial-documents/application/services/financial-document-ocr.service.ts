import type { FinancialOcrProvider } from "../../domain/ports/financial-ocr-provider.port";

export type OcrExtractResult = {
  text: string;
  raw?: unknown;
};

export class FinancialDocumentOcrService {
  constructor(private readonly provider: FinancialOcrProvider) {}

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    pdfPassword?: string,
  ): Promise<OcrExtractResult> {
    const started = Date.now();
    let failed = false;
    let providerUsed = "unknown";
    let confidence: number | undefined;
    let fallbackUsed = false;

    try {
      const result = await this.provider.extract({ fileBuffer, mimeType, pdfPassword });
      const raw =
        typeof result.raw === "object" && result.raw !== null
          ? (result.raw as Record<string, unknown>)
          : {};
      providerUsed = String(raw.provider ?? "unknown");
      confidence = typeof raw.confidence === "number" ? raw.confidence : undefined;
      fallbackUsed = raw.ocr_fallback_used === true || raw.fallback === true;

      console.log(
        JSON.stringify({
          scope: "financial-document-ocr",
          ocr_provider_used: providerUsed,
          ocr_elapsed_ms: Date.now() - started,
          ocr_confidence: confidence ?? null,
          ocr_failed: false,
          ocr_fallback_used: fallbackUsed,
          mimeType,
        }),
      );

      return result;
    } catch (error) {
      failed = true;
      console.log(
        JSON.stringify({
          scope: "financial-document-ocr",
          ocr_provider_used: providerUsed,
          ocr_elapsed_ms: Date.now() - started,
          ocr_confidence: null,
          ocr_failed: failed,
          ocr_fallback_used: fallbackUsed,
          mimeType,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }
}
