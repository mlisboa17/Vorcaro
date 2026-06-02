import { NextResponse } from "next/server";
import { PdfParseError } from "@/lib/parsers/pdf-import-errors";

export function pdfImportErrorResponse(error: PdfParseError) {
  return NextResponse.json(
    {
      success: false,
      errorCode: error.code,
      message: error.message,
      error: error.message,
    },
    { status: 400 },
  );
}

export function isPdfParseError(error: unknown): error is PdfParseError {
  return error instanceof PdfParseError;
}
