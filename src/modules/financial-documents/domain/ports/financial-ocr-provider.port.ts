export interface FinancialOcrProvider {
  extract(input: {
    fileBuffer: Buffer;
    mimeType: string;
    pdfPassword?: string;
  }): Promise<{
    text: string;
    raw?: unknown;
  }>;
}
