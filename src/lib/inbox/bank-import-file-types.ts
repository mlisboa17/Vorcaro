export type BankImportFileFormat = "PDF" | "OFX" | "CSV" | "XLS" | "XLSX" | "IMAGE" | "UNKNOWN";

export type BankImportFileKind = "structured" | "document" | "unknown";

const EXTENSION_MAP: Record<string, BankImportFileFormat> = {
  pdf: "PDF",
  ofx: "OFX",
  csv: "CSV",
  xls: "XLS",
  xlsx: "XLSX",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  webp: "IMAGE",
};

export function detectBankImportFileFormat(fileName: string): BankImportFileFormat {
  const ext = fileName.toLowerCase().trim().split(".").pop() ?? "";
  return EXTENSION_MAP[ext] ?? "UNKNOWN";
}

export function isStructuredBankImportFormat(format: BankImportFileFormat): boolean {
  return format === "OFX" || format === "CSV" || format === "XLS" || format === "XLSX";
}

export function bankImportFormatLabel(format: BankImportFileFormat): string {
  switch (format) {
    case "PDF":
      return "PDF";
    case "OFX":
      return "OFX";
    case "CSV":
      return "CSV";
    case "XLS":
    case "XLSX":
      return "Excel";
    case "IMAGE":
      return "Imagem";
    default:
      return "Desconhecido";
  }
}

export const BANK_IMPORT_ACCEPT_INBOX =
  ".pdf,.ofx,.csv,.xls,.xlsx,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const BANK_IMPORT_ACCEPT_BY_FORMAT: Record<Exclude<BankImportFileFormat, "UNKNOWN" | "IMAGE">, string> = {
  PDF: ".pdf,application/pdf",
  OFX: ".ofx",
  CSV: ".csv,text/csv",
  XLS: ".xls,application/vnd.ms-excel",
  XLSX: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function formatPriorityHint(format: BankImportFileFormat): string | null {
  if (format === "OFX" || format === "CSV" || format === "XLS" || format === "XLSX") {
    return "Este formato é estruturado e costuma ter melhor reconhecimento que PDF.";
  }
  if (format === "PDF") {
    return "PDFs podem exigir mais revisão. Se o banco permitir, prefira OFX, CSV ou Excel.";
  }
  return null;
}
