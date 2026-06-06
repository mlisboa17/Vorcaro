import { resolveBankProfile } from "@/lib/bank-parsers/bank-statement-profile-resolver";
import { resolveBankStatement } from "@/lib/bank-parsers/bank-statement-parser-resolver";
import type { BankImportFileFormat } from "@/lib/inbox/bank-import-file-types";
import type {
  StatementLayoutFingerprint,
  StatementLayoutFormat,
  StatementLayoutStructureRules,
} from "../types/statement-layout-model.types";

const HEADER_MARKERS =
  /extrato|saldo anterior|lan[cç]amento|data|hist[oó]rico|ag[eê]ncia|conta corrente|per[ií]odo/i;
const FOOTER_MARKERS =
  /saldo final|total de|emitido em|p[aá]gina \d|continua|fim do extrato|www\./i;
const BALANCE_MARKERS = /saldo (anterior|do dia|final|dispon[ií]vel)|saldos/i;
const CONTINUATION_MARKERS = /continua na pr[oó]xima|continuação|ver p[aá]gina/i;

const DATE_PATTERNS = [
  String.raw`\d{2}/\d{2}/\d{4}`,
  String.raw`\d{2}/\d{2}`,
  String.raw`\d{4}-\d{2}-\d{2}`,
];

const AMOUNT_PATTERNS = [
  String.raw`R\$\s*[\d.,]+`,
  String.raw`-?\d{1,3}(?:\.\d{3})*,\d{2}`,
  String.raw`-?\d+\.\d{2}`,
];

function mapFileFormat(format: BankImportFileFormat | string): StatementLayoutFormat {
  switch (format) {
    case "PDF":
      return "PDF";
    case "OFX":
      return "OFX";
    case "CSV":
      return "CSV";
    case "XLS":
      return "XLS";
    case "XLSX":
      return "XLSX";
    default:
      return "UNKNOWN";
  }
}

function extractLines(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniquePatterns(lines: string[], matcher: RegExp, limit = 8): string[] {
  const hits = new Set<string>();
  for (const line of lines) {
    if (matcher.test(line)) {
      hits.add(line.slice(0, 120));
      if (hits.size >= limit) break;
    }
  }
  return [...hits];
}

function extractKeywords(lines: string[], limit = 20): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    for (const token of line.toLowerCase().split(/[^a-zà-ú0-9]+/i)) {
      if (token.length < 4) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function looksLikeAmount(text: string): boolean {
  return /R\$|\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}/.test(text);
}

function extractColumnNames(firstLines: string[], format: StatementLayoutFormat): string[] {
  if (format !== "CSV" && format !== "XLS" && format !== "XLSX") return [];
  const COLUMN_HEADER_HINT =
    /data|hist|lanc|lan[cç]|valor|saldo|debito|d[eé]bito|credito|cr[eé]dito|dt_|descricao|descri[cç][aã]o|tipo/i;

  for (const line of firstLines.slice(0, 40)) {
    const delimiter = line.includes(";") ? ";" : line.includes("\t") ? "\t" : line.includes(",") ? "," : null;
    if (!delimiter) continue;
    const cols = line
      .split(delimiter)
      .map((col) => col.trim())
      .filter(Boolean);
    if (cols.length < 2 || cols.some((c) => looksLikeAmount(c))) continue;
    const headerHits = cols.filter((c) => COLUMN_HEADER_HINT.test(c)).length;
    if (headerHits >= 2 || (cols.length >= 3 && headerHits >= 1)) {
      return cols;
    }
  }
  return [];
}

function detectPatternsInSample(lines: string[], regexes: string[]): string[] {
  const found: string[] = [];
  for (const pattern of regexes) {
    const re = new RegExp(pattern);
    if (lines.some((line) => re.test(line))) {
      found.push(pattern);
    }
  }
  return found;
}

export function buildStatementLayoutFingerprint(input: {
  content: string;
  fileName?: string;
  fileFormat?: StatementLayoutFormat | BankImportFileFormat;
}): StatementLayoutFingerprint {
  const lines = extractLines(input.content);
  const format = mapFileFormat(input.fileFormat ?? "UNKNOWN");
  const sample = lines.slice(0, 200);

  let bankId: string | null = null;
  let bankName: string | null = null;
  let profile: "PF" | "PJ" | "UNKNOWN" = "UNKNOWN";

  if (format === "PDF" || format === "UNKNOWN") {
    const resolved = resolveBankStatement(input.content.slice(0, 8000));
    bankId = resolved.parser?.bankId ?? resolved.statement.bank?.toLowerCase().replace(/\s+/g, "_") ?? null;
    bankName = resolved.statement.bank ?? null;
    profile = resolved.detectedProfile ?? resolveBankProfile(input.content);
  } else {
    profile = resolveBankProfile(input.content);
    const bankMatch = input.content.match(
      /\b(bradesco|santander|itau|itaú|banco do brasil|\bbb\b|caixa|nubank|inter|sicredi|sicoob|c6|novo banco)\b/i,
    );
    if (bankMatch) {
      bankName = bankMatch[1]!;
      bankId = bankName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace("itaú", "itau").replace("banco_do_brasil", "bb");
    }
  }

  return {
    bankId,
    bankName,
    profile,
    fileFormat: format,
    columnNames: extractColumnNames(sample, format),
    headerPatterns: uniquePatterns(sample.slice(0, 40), HEADER_MARKERS),
    footerPatterns: uniquePatterns(sample.slice(-40), FOOTER_MARKERS),
    balanceLinePatterns: uniquePatterns(sample, BALANCE_MARKERS),
    continuationPatterns: uniquePatterns(sample, CONTINUATION_MARKERS),
    datePatterns: detectPatternsInSample(sample, DATE_PATTERNS),
    amountPatterns: detectPatternsInSample(sample, AMOUNT_PATTERNS),
    keywords: extractKeywords(sample),
    sampleLines: sample.slice(0, 12),
    lineCount: lines.length,
  };
}

export function buildDefaultStructureRules(
  fingerprint: StatementLayoutFingerprint,
): StatementLayoutStructureRules {
  return {
    datePatterns: fingerprint.datePatterns.length ? fingerprint.datePatterns : DATE_PATTERNS,
    amountPatterns: fingerprint.amountPatterns.length ? fingerprint.amountPatterns : AMOUNT_PATTERNS,
    debitCreditRules: {
      debitMarkers: ["debito", "débito", "saida", "saída", "d", "pagamento"],
      creditMarkers: ["credito", "crédito", "entrada", "c", "recebimento"],
      separateColumns: fingerprint.columnNames.some((c) => /debito|credito|d[eé]bito|cr[eé]dito/i.test(c)),
    },
    headerPatterns: fingerprint.headerPatterns,
    footerPatterns: fingerprint.footerPatterns,
    balanceLinePatterns: fingerprint.balanceLinePatterns,
    continuationPatterns: fingerprint.continuationPatterns,
    expectedColumns: fingerprint.columnNames,
    keywords: fingerprint.keywords,
    correctedExamples: [],
  };
}

export function fingerprintFromJson(value: unknown): StatementLayoutFingerprint | null {
  if (!value || typeof value !== "object") return null;
  return value as StatementLayoutFingerprint;
}

export function structureRulesFromJson(value: unknown): StatementLayoutStructureRules | null {
  if (!value || typeof value !== "object") return null;
  return value as StatementLayoutStructureRules;
}
