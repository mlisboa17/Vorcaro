export type PdfImportErrorCode =
  | "PDF_PASSWORD_REQUIRED"
  | "PDF_INVALID_PASSWORD"
  | "PDF_PARSE_ERROR";

const MESSAGES: Record<PdfImportErrorCode, string> = {
  PDF_PASSWORD_REQUIRED: "PDF protegido por senha.",
  PDF_INVALID_PASSWORD: "Senha inválida para este PDF.",
  PDF_PARSE_ERROR: "Falha ao processar o PDF.",
};

export class PdfParseError extends Error {
  readonly code: PdfImportErrorCode;

  constructor(code: PdfImportErrorCode, message = MESSAGES[code]) {
    super(message);
    this.name = "PdfParseError";
    this.code = code;
  }
}

export function isPasswordRelatedPdfError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { name?: string; code?: number; message?: string };
  if (record.name === "PasswordException") {
    return true;
  }

  if (record.code === 1 || record.code === 2) {
    return true;
  }

  const message = String(record.message ?? error).toLowerCase();
  return (
    message.includes("password") ||
    message.includes("senha") ||
    message.includes("encrypted") ||
    message.includes("needs password")
  );
}

export function toPdfParseError(error: unknown, hadPassword: boolean): PdfParseError {
  if (error instanceof PdfParseError) {
    return error;
  }

  if (isPasswordRelatedPdfError(error)) {
    return hadPassword
      ? new PdfParseError("PDF_INVALID_PASSWORD")
      : new PdfParseError("PDF_PASSWORD_REQUIRED");
  }

  return new PdfParseError("PDF_PARSE_ERROR");
}
