import crypto from "crypto";
import type { ExtractedBankStatementTransaction } from "@/modules/financial-documents/domain/types/financial-document-import.types";

const BRADESCO_MARKERS = /\bbradesco\b/i;

const STATEMENT_MARKERS =
  /extrato(?:\s+de\s+conta|\s+banc[aá]rio)?|saldo\s+(?:anterior|atual|final)|lan[cç]amentos?\s+do\s+per[ií]odo|conta\s+corrente/i;

const INVOICE_MARKERS =
  /fatura\s+(?:do\s+)?cart[aã]o|valor\s+(?:total\s+)?da\s+fatura|total\s+para\s+pr[oó]ximas\s+faturas|limite\s+utilizad/i;

const SKIP_LINE =
  /^(data|lan[cç]amento|hist[oó]rico|documento|d[eé]bito|cr[eé]dito|saldo|total|resumo|pagamento|vencimento|bradesco|extrato|conta)/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseBrazilianAmount(value: string): number | null {
  const cleaned = value
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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
  if (/ted|doc|transfer/.test(lower)) return "TRANSFERENCIA";
  if (/boleto/.test(lower)) return "BOLETO";
  if (/cart[aã]o|compra\s+cart/.test(lower)) return "CARTAO_CREDITO";
  return "OUTROS";
}

function lineConfidence(parts: { date?: string; description?: string; amount?: number | null }): number {
  let score = 40;
  if (parts.date) score += 25;
  if (parts.description && parts.description.length >= 3) score += 20;
  if (parts.amount != null && parts.amount !== 0) score += 15;
  return Math.min(score, 98);
}

function makeLineId(payload: string): string {
  return `bs_${crypto.createHash("sha256").update(payload).digest("hex").slice(0, 12)}`;
}

export function isBradescoBankStatementText(text: string): boolean {
  if (!BRADESCO_MARKERS.test(text)) return false;
  if (INVOICE_MARKERS.test(text) && !STATEMENT_MARKERS.test(text)) return false;
  return STATEMENT_MARKERS.test(text) || /\bd[eé]bito\b.*\bcr[eé]dito\b/i.test(text);
}

export function isBradescoCardInvoiceText(text: string): boolean {
  if (!BRADESCO_MARKERS.test(text)) return false;
  if (isBradescoBankStatementText(text)) return false;
  return INVOICE_MARKERS.test(text) || /\d{2}\/\d{2}\s+.+\d{1,3}(?:\.\d{3})*,\d{2}/.test(text);
}

const COLUMN_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(\d{4,})\s+([\d.,]+|-)\s+([\d.,]+|-)\s+([\d.,]+)\s*$/i;

const SIMPLE_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*$/;

function parseStatementLine(line: string): ExtractedBankStatementTransaction | null {
  const normalized = normalizeWhitespace(line);
  if (!normalized || SKIP_LINE.test(normalized)) return null;

  const columnMatch = normalized.match(COLUMN_LINE);
  if (columnMatch) {
    const date = normalizeDate(columnMatch[1]!);
    const description = normalizeWhitespace(columnMatch[2]!);
    const documentNumber = columnMatch[3]!;
    const debit = columnMatch[4] !== "-" ? parseBrazilianAmount(columnMatch[4]!) : null;
    const credit = columnMatch[5] !== "-" ? parseBrazilianAmount(columnMatch[5]!) : null;
    const balanceAfter = parseBrazilianAmount(columnMatch[6]!) ?? undefined;

    const amount = debit != null && debit > 0 ? debit : credit != null && credit > 0 ? credit : null;
    if (amount == null || !description) return null;

    const direction: "INCOME" | "EXPENSE" = credit != null && credit > 0 ? "INCOME" : "EXPENSE";

    return {
      id: makeLineId(normalized),
      date: date ?? new Date().toISOString().slice(0, 10),
      description,
      amount,
      direction,
      balanceAfter,
      documentNumber,
      method: detectMethod(description),
      confidence: lineConfidence({ date: date ?? undefined, description, amount }),
      selected: true,
    };
  }

  const simpleMatch = normalized.match(SIMPLE_LINE);
  if (simpleMatch) {
    const date = normalizeDate(simpleMatch[1]!);
    const amount = parseBrazilianAmount(simpleMatch[3]!);
    const description = normalizeWhitespace(simpleMatch[2]!);
    if (amount == null || !description) return null;

    const direction: "INCOME" | "EXPENSE" = amount < 0 ? "EXPENSE" : "INCOME";

    return {
      id: makeLineId(normalized),
      date: date ?? new Date().toISOString().slice(0, 10),
      description,
      amount: Math.abs(amount),
      direction,
      method: detectMethod(description),
      confidence: lineConfidence({ date: date ?? undefined, description, amount }),
      selected: true,
    };
  }

  return null;
}

export function parseBradescoBankStatementText(text: string): ExtractedBankStatementTransaction[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ExtractedBankStatementTransaction[] = [];

  for (const line of lines.slice(0, 800)) {
    const parsed = parseStatementLine(line);
    if (parsed) result.push(parsed);
  }

  return result;
}
