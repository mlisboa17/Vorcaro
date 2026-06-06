import crypto from "crypto";
import type { ExtractedBankStatementTransaction } from "@/modules/financial-documents/domain/types/financial-document-import.types";

export type BradescoLineParseStatus = "RECOGNIZED" | "NEEDS_REVIEW" | "IGNORED" | "ERROR";

export type BradescoParsedLine = {
  id: string;
  date?: string;
  description: string;
  amount?: number;
  direction?: "INCOME" | "EXPENSE";
  balanceAfter?: number;
  documentNumber?: string;
  method?: ExtractedBankStatementTransaction["method"];
  rawLine: string;
  rawLines: string[];
  parseStatus: BradescoLineParseStatus;
  confidence: number;
  reviewMessage?: string;
};

export type BradescoParseResult = {
  lines: BradescoParsedLine[];
  summary: {
    total: number;
    recognized: number;
    needsReview: number;
    ignored: number;
    errors: number;
  };
  processedInChunks: boolean;
  chunkCount: number;
};

const LONG_STATEMENT_LINE_THRESHOLD = 150;
const CHUNK_SIZE = 120;
const CHUNK_OVERLAP = 8;

const DATE_START = /^(\d{2}\/\d{2}(?:\/\d{4})?)/;

const IGNORE_LINE =
  /^(data|lan[cç]amento|hist[oó]rico|documento|d[eé]bito|cr[eé]dito|saldo|total|resumo|vencimento|bradesco|extrato|conta|per[ií]odo|ag[eê]ncia|cnpj|raz[aã]o\s+social|titular|cpf|internet\s+banking)/i;

const IGNORE_CONTENT =
  /saldo\s+(?:anterior|atual|final|do\s+dia)|^total\b|lan[cç]amentos?\s+do\s+per[ií]odo|p[aá]gina\s+\d+\s+de\s+\d+|continua\s+na\s+pr[oó]xima/i;

const COLUMN_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(\d{3,})\s+(R\$?\s*)?([\d.,]+|-)\s+(R\$?\s*)?([\d.,]+|-)\s+(R\$?\s*)?(-?[\d.,]+)\s*$/i;

const DC_SUFFIX_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(R\$?\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*([DC])\s*$/i;

const AMOUNT_SUFFIX_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(R\$?\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*$/;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseBradescoBrazilianAmount(raw: string): number | null {
  if (!raw || raw.trim() === "-" || raw.trim() === "") return null;
  let cleaned = raw
    .replace(/R\$\s*/gi, "")
    .replace(/\s+/g, "")
    .trim();

  const trailingSign = cleaned.match(/^(.+?)([DC])$/i);
  if (trailingSign) cleaned = trailingSign[1]!;

  const isNegative = cleaned.startsWith("-") || cleaned.endsWith("-");
  cleaned = cleaned.replace(/-/g, "");

  cleaned = cleaned.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!cleaned || cleaned === ".") return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return isNegative ? -Math.abs(parsed) : parsed;
}

function normalizeDate(value: string): string | null {
  const br = value.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (!br) return null;
  const year = br[3] ?? String(new Date().getFullYear());
  return `${year}-${br[2]}-${br[1]}`;
}

function detectMethod(description: string): ExtractedBankStatementTransaction["method"] {
  const lower = description.toLowerCase();
  if (/pix/.test(lower)) return "PIX";
  if (/\bted\b|\bdoc\b|transfer/.test(lower)) return "TRANSFERENCIA";
  if (/boleto/.test(lower)) return "BOLETO";
  if (/cart[aã]o|compra\s+cart/.test(lower)) return "CARTAO_CREDITO";
  if (/tarifa|taxa|pacote\s+serv|manuten[cç][aã]o|iof/.test(lower)) return "TARIFA";
  return "OUTROS";
}

function makeLineId(payload: string): string {
  return `bs_${crypto.createHash("sha256").update(payload).digest("hex").slice(0, 12)}`;
}

function lineConfidence(parts: {
  date?: string;
  description?: string;
  amount?: number | null;
  hasDirection?: boolean;
}): number {
  let score = 35;
  if (parts.date) score += 25;
  if (parts.description && parts.description.length >= 3) score += 20;
  if (parts.amount != null && parts.amount !== 0) score += 15;
  if (parts.hasDirection) score += 5;
  return Math.min(score, 98);
}

function shouldIgnoreLine(line: string): boolean {
  const normalized = normalizeWhitespace(line);
  if (!normalized) return true;
  if (IGNORE_LINE.test(normalized) && !DATE_START.test(normalized)) return true;
  if (IGNORE_CONTENT.test(normalized) && !DATE_START.test(normalized)) return true;
  return false;
}

function mergePhysicalLines(text: string): string[] {
  const physical = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const logical: string[] = [];
  let buffer = "";
  let bufferRaw: string[] = [];

  const flushBuffer = () => {
    if (buffer) logical.push(buffer);
    buffer = "";
    bufferRaw = [];
  };

  for (const line of physical) {
    if (shouldIgnoreLine(line)) {
      flushBuffer();
      logical.push(`__IGNORE__:${line}`);
      continue;
    }

    if (DATE_START.test(line)) {
      flushBuffer();
      buffer = line;
      bufferRaw = [line];
    } else if (buffer) {
      buffer = `${buffer} ${line}`;
      bufferRaw.push(line);
    } else {
      logical.push(line);
    }
  }
  flushBuffer();
  return logical;
}

function parseLogicalLine(logicalLine: string, rawLines: string[]): BradescoParsedLine | null {
  if (logicalLine.startsWith("__IGNORE__:")) {
    const raw = logicalLine.replace("__IGNORE__:", "");
    return {
      id: makeLineId(`ignored:${raw}`),
      description: raw,
      rawLine: raw,
      rawLines: [raw],
      parseStatus: "IGNORED",
      confidence: 100,
    };
  }

  const normalized = normalizeWhitespace(logicalLine);
  const rawLine = rawLines.length > 0 ? rawLines.join("\n") : normalized;

  const columnMatch = normalized.match(COLUMN_LINE);
  if (columnMatch) {
    const date = normalizeDate(columnMatch[1]!);
    const description = normalizeWhitespace(columnMatch[2]!);
    const documentNumber = columnMatch[3]!;
    const debit = columnMatch[5] !== "-" ? parseBradescoBrazilianAmount(columnMatch[5]!) : null;
    const credit = columnMatch[7] !== "-" ? parseBradescoBrazilianAmount(columnMatch[7]!) : null;
    const balanceAfter = parseBradescoBrazilianAmount(columnMatch[9]!) ?? undefined;

    const amount =
      debit != null && Math.abs(debit) > 0
        ? Math.abs(debit)
        : credit != null && Math.abs(credit) > 0
          ? Math.abs(credit)
          : null;

    if (amount == null || !description) {
      return {
        id: makeLineId(rawLine),
        date: date ?? undefined,
        description: description || normalized,
        rawLine,
        rawLines: rawLines.length ? rawLines : [normalized],
        parseStatus: "NEEDS_REVIEW",
        confidence: 40,
        reviewMessage:
          "Não conseguimos identificar o valor deste lançamento. Confira a linha original e informe o valor manualmente.",
      };
    }

    const direction: "INCOME" | "EXPENSE" =
      credit != null && Math.abs(credit) > 0 ? "INCOME" : "EXPENSE";

    return {
      id: makeLineId(rawLine),
      date: date ?? undefined,
      description,
      amount,
      direction,
      balanceAfter,
      documentNumber,
      method: detectMethod(description),
      rawLine,
      rawLines: rawLines.length ? rawLines : [normalized],
      parseStatus: "RECOGNIZED",
      confidence: lineConfidence({ date: date ?? undefined, description, amount, hasDirection: true }),
    };
  }

  const dcMatch = normalized.match(DC_SUFFIX_LINE);
  if (dcMatch) {
    const date = normalizeDate(dcMatch[1]!);
    const description = normalizeWhitespace(dcMatch[2]!);
    const amountRaw = parseBradescoBrazilianAmount(dcMatch[4]!);
    const dc = dcMatch[5]!.toUpperCase();

    if (amountRaw == null || !description) {
      return buildNeedsReview(rawLine, rawLines, normalized, date ?? undefined);
    }

    const direction: "INCOME" | "EXPENSE" =
      dc === "C" || amountRaw > 0 ? "INCOME" : "EXPENSE";

    return {
      id: makeLineId(rawLine),
      date: date ?? undefined,
      description,
      amount: Math.abs(amountRaw),
      direction,
      method: detectMethod(description),
      rawLine,
      rawLines: rawLines.length ? rawLines : [normalized],
      parseStatus: "RECOGNIZED",
      confidence: lineConfidence({ date: date ?? undefined, description, amount: Math.abs(amountRaw), hasDirection: true }),
    };
  }

  const amountMatch = normalized.match(AMOUNT_SUFFIX_LINE);
  if (amountMatch) {
    const date = normalizeDate(amountMatch[1]!);
    const description = normalizeWhitespace(amountMatch[2]!);
    const amountRaw = parseBradescoBrazilianAmount(amountMatch[4]!);

    if (amountRaw == null || !description) {
      return buildNeedsReview(rawLine, rawLines, normalized, date ?? undefined);
    }

    const direction: "INCOME" | "EXPENSE" = amountRaw < 0 ? "EXPENSE" : "INCOME";

    return {
      id: makeLineId(rawLine),
      date: date ?? undefined,
      description,
      amount: Math.abs(amountRaw),
      direction,
      method: detectMethod(description),
      rawLine,
      rawLines: rawLines.length ? rawLines : [normalized],
      parseStatus: "RECOGNIZED",
      confidence: lineConfidence({ date: date ?? undefined, description, amount: Math.abs(amountRaw), hasDirection: true }),
    };
  }

  if (DATE_START.test(normalized)) {
    return buildNeedsReview(rawLine, rawLines, normalized, normalizeDate(normalized.match(DATE_START)![1]!) ?? undefined);
  }

  if (normalized.length > 8) {
    return {
      id: makeLineId(rawLine),
      description: normalized,
      rawLine,
      rawLines: rawLines.length ? rawLines : [normalized],
      parseStatus: "ERROR",
      confidence: 10,
      reviewMessage: "Esta linha não pôde ser interpretada. Verifique se é um lançamento válido ou ignore-a.",
    };
  }

  return null;
}

function buildNeedsReview(
  rawLine: string,
  rawLines: string[],
  normalized: string,
  date?: string,
): BradescoParsedLine {
  return {
    id: makeLineId(rawLine),
    date,
    description: normalized,
    amount: undefined,
    rawLine,
    rawLines: rawLines.length ? rawLines : [normalized],
    parseStatus: "NEEDS_REVIEW",
    confidence: 35,
    reviewMessage:
      "Não conseguimos identificar o valor deste lançamento. Confira a linha original e informe o valor manualmente.",
  };
}

function summarize(lines: BradescoParsedLine[]): BradescoParseResult["summary"] {
  return {
    total: lines.length,
    recognized: lines.filter((l) => l.parseStatus === "RECOGNIZED").length,
    needsReview: lines.filter((l) => l.parseStatus === "NEEDS_REVIEW").length,
    ignored: lines.filter((l) => l.parseStatus === "IGNORED").length,
    errors: lines.filter((l) => l.parseStatus === "ERROR").length,
  };
}

function parseBradescoChunk(text: string): BradescoParsedLine[] {
  const merged = mergePhysicalLines(text);
  const results: BradescoParsedLine[] = [];

  for (const logical of merged) {
    const rawLines = logical.startsWith("__IGNORE__:")
      ? [logical.replace("__IGNORE__:", "")]
      : [logical];
    const parsed = parseLogicalLine(logical, rawLines);
    if (parsed) results.push(parsed);
  }

  return results;
}

export function parseBradescoStatementFull(text: string): BradescoParseResult {
  const physicalLineCount = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim()).length;

  if (physicalLineCount <= LONG_STATEMENT_LINE_THRESHOLD) {
    const lines = parseBradescoChunk(text);
    return { lines, summary: summarize(lines), processedInChunks: false, chunkCount: 1 };
  }

  const allLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const chunks: string[] = [];

  for (let i = 0; i < allLines.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    chunks.push(allLines.slice(i, i + CHUNK_SIZE).join("\n"));
  }

  const merged = new Map<string, BradescoParsedLine>();
  for (const chunk of chunks) {
    for (const line of parseBradescoChunk(chunk)) {
      merged.set(line.id, line);
    }
  }

  const lines = [...merged.values()];
  return {
    lines,
    summary: summarize(lines),
    processedInChunks: true,
    chunkCount: chunks.length,
  };
}

export function bradescoParsedLineToTransaction(line: BradescoParsedLine): ExtractedBankStatementTransaction {
  const needsReview = line.parseStatus === "NEEDS_REVIEW" || line.parseStatus === "ERROR";
  return {
    id: line.id,
    date: line.date ?? new Date().toISOString().slice(0, 10),
    description: line.description,
    amount: line.amount ?? 0,
    direction: line.direction ?? "EXPENSE",
    balanceAfter: line.balanceAfter,
    documentNumber: line.documentNumber,
    method: line.method,
    rawLine: line.rawLine,
    confidence: line.confidence,
    warnings: line.reviewMessage ? [line.reviewMessage] : [],
    selected: line.parseStatus === "RECOGNIZED",
    parseStatus: line.parseStatus,
    reviewMessage: line.reviewMessage,
  };
}

export function parseBradescoBankStatementWithStatus(text: string): BradescoParseResult {
  return parseBradescoStatementFull(text);
}
