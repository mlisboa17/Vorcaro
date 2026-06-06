import type { ImportedFinancialLine } from "@/modules/financial-inbox/domain/types/imported-financial-line";
import { parseBradescoBrazilianAmount } from "./bradesco-statement-line-parser";

export type ImportLineParseStatus = "RECOGNIZED" | "NEEDS_REVIEW" | "IGNORED" | "ERROR";

export type ImportLineSummary = {
  total: number;
  recognized: number;
  needsReview: number;
  ignored: number;
  errors: number;
};

const CSV_HEADER =
  /^(data|date|dt|lan[cç]amento|hist[oó]rico|descri[cç][aã]o|valor|amount|saldo|documento|d[eé]bito|cr[eé]dito)/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseStructuredAmount(raw: string): number | null {
  if (!raw?.trim()) return null;
  return parseBradescoBrazilianAmount(raw);
}

function optionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

export function normalizeImportDate(value: string): string | null {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = raw.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (br) {
    const year = br[3] ?? String(new Date().getFullYear());
    return `${year}-${br[2]}-${br[1]}`;
  }

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  return null;
}

function classifyLine(line: ImportedFinancialLine): ImportedFinancialLine {
  if (line.parseStatus === "IGNORED") return line;

  const hasDate = Boolean(line.date);
  const hasDescription = Boolean(line.description && line.description.length >= 2);
  const hasAmount = typeof line.amount === "number" && line.amount !== 0;

  let parseStatus: ImportLineParseStatus = "RECOGNIZED";
  let reviewMessage: string | undefined;

  if (!hasDate || !hasDescription || !hasAmount) {
    parseStatus = "NEEDS_REVIEW";
    if (!hasAmount) {
      reviewMessage =
        "Não conseguimos identificar o valor deste lançamento. Confira a linha original e informe o valor manualmente.";
    } else if (!hasDate) {
      reviewMessage = "A data deste lançamento não ficou clara. Confira e ajuste se necessário.";
    } else {
      reviewMessage = "A descrição deste lançamento precisa de revisão.";
    }
  }

  return { ...line, parseStatus, reviewMessage };
}

export function isLikelyCsvHeader(line: string): boolean {
  const cols = line.split(/[;\t,]/).map((c) => c.trim());
  if (cols.length < 2) return false;
  const headerHits = cols.filter((c) => CSV_HEADER.test(c)).length;
  return headerHits >= 2;
}

export function enrichImportedLines(lines: ImportedFinancialLine[]): ImportedFinancialLine[] {
  return lines.map((line) => {
    if (line.parseStatus === "IGNORED") return line;
    return classifyLine(line);
  });
}

export function buildImportLineSummary(lines: ImportedFinancialLine[]): ImportLineSummary {
  return {
    total: lines.length,
    recognized: lines.filter((l) => l.parseStatus === "RECOGNIZED" || (!l.parseStatus && l.amount)).length,
    needsReview: lines.filter((l) => l.parseStatus === "NEEDS_REVIEW").length,
    ignored: lines.filter((l) => l.parseStatus === "IGNORED").length,
    errors: lines.filter((l) => l.parseStatus === "ERROR").length,
  };
}

export function parseCsvRow(line: string, delimiter: string): ImportedFinancialLine {
  const cols = line.split(delimiter).map((value) => value.trim());
  const dateCol = cols.find((c) => normalizeImportDate(c));
  const amountCols = cols
    .map((c) => ({ raw: c, amount: parseStructuredAmount(c) }))
    .filter((entry) => entry.amount !== null);

  let amount: number | undefined;

  if (amountCols.length >= 2) {
    const debit = amountCols.find((e) => /d[eé]bito|debito|saida|sa[ií]da/i.test(e.raw) || e.amount! < 0);
    const credit = amountCols.find((e) => /cr[eé]dito|credito|entrada/i.test(e.raw) || e.amount! > 0);
    if (debit?.amount != null) amount = Math.abs(debit.amount);
    else if (credit?.amount != null) amount = Math.abs(credit.amount);
    else amount = Math.abs(amountCols[amountCols.length - 1]!.amount!);
  } else if (amountCols[0]?.amount != null) {
    amount = amountCols[0].amount;
  }

  const descriptionCandidate =
    cols.find(
      (c) =>
        c &&
        !normalizeImportDate(c) &&
        parseStructuredAmount(c) === null &&
        !CSV_HEADER.test(c),
    ) ?? cols.find((c) => c && !normalizeImportDate(c) && parseStructuredAmount(c) === null);

  const date = dateCol ? optionalString(normalizeImportDate(dateCol)) : undefined;
  const description = descriptionCandidate ? normalizeWhitespace(descriptionCandidate) : undefined;

  const base: ImportedFinancialLine = {
    date,
    amount,
    description,
    rawContent: normalizeWhitespace(line),
  };

  return classifyLine(base);
}
