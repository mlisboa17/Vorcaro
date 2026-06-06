export type FinancialDocumentProcessingErrorCode =
  | "PDF_PASSWORD_REQUIRED"
  | "PDF_INVALID_PASSWORD"
  | "OCR_EMPTY"
  | "CORRUPT_FILE"
  | "INSUFFICIENT_EXTRACTION";

const MESSAGES: Record<FinancialDocumentProcessingErrorCode, string> = {
  PDF_PASSWORD_REQUIRED: "Documento protegido por senha.",
  PDF_INVALID_PASSWORD: "Senha inválida para este PDF.",
  OCR_EMPTY: "Não foi possível extrair informações suficientes.",
  CORRUPT_FILE: "Arquivo inválido ou corrompido.",
  INSUFFICIENT_EXTRACTION: "Não foi possível extrair informações suficientes.",
};

export class FinancialDocumentProcessingError extends Error {
  constructor(
    readonly code: FinancialDocumentProcessingErrorCode,
    message?: string,
  ) {
    super(message ?? MESSAGES[code]);
    this.name = "FinancialDocumentProcessingError";
  }
}

export function processingErrorUserMessage(code: FinancialDocumentProcessingErrorCode): string {
  return MESSAGES[code];
}
