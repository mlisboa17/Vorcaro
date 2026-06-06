import crypto from "crypto";
import type {
  BankStatementTransactionMethod,
  ExtractedBankStatement,
  ExtractedBankStatementTransaction,
} from "./bank-statement-parser.types";

const SKIP_LINE =
  /^(data|lan[cç]amento|hist[oó]rico|documento|d[eé]bito|cr[eé]dito|saldo|total|resumo|pagamento|vencimento|extrato|conta|per[ií]odo|ag[eê]ncia|titular|cliente)/i;

const COLUMN_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(\d{3,})\s+([\d.,]+|-)\s+([\d.,]+|-)\s+([\d.,]+)\s*$/i;

const SIMPLE_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*$/;

const DEBIT_CREDIT_LINE =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(D|C|D[eé]bito|Cr[eé]dito)\s+([\d.,]+)\s*$/i;

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseBrazilianAmount(value: string): number | null {
  const cleaned = value
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDateToIso(value: string): string | null {
  const br = value.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (br) {
    const year = br[3] ?? String(new Date().getFullYear());
    return `${year}-${br[2]}-${br[1]}`;
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  return null;
}

export function inferDirectionFromDescription(
  description: string,
  amountRaw?: number,
): "INCOME" | "EXPENSE" {
  const lower = description.toLowerCase();
  if (
    /recebido|recebiment|cr[eé]dito|entrada|deposit|sal[aá]rio|pix\s+receb|transfer[eê]ncia\s+receb/.test(
      lower,
    )
  ) {
    return "INCOME";
  }
  if (
    /enviad|pagamento|pago|compra|tarifa|d[eé]bito|sa[ií]da|boleto|ted\s+env|doc\s+env|pix\s+env|transfer[eê]ncia\s+env/.test(
      lower,
    )
  ) {
    return "EXPENSE";
  }
  if (amountRaw != null && amountRaw < 0) return "EXPENSE";
  return "INCOME";
}

export function detectTransactionMethod(description: string): BankStatementTransactionMethod {
  const lower = description.toLowerCase();
  if (/pix/.test(lower)) return "PIX";
  if (/ted|doc|transfer[eê]ncia/.test(lower)) return "TRANSFERENCIA";
  if (/boleto|pagamento\s+de\s+t[ií]tulo/.test(lower)) return "BOLETO";
  if (/cart[aã]o|compra\s+cart|cr[eé]dito\s+loja/.test(lower)) return "CARTAO_CREDITO";
  if (/tarifa|taxa|pacote\s+serv|manuten[cç][aã]o/.test(lower)) return "TARIFA";
  return "OUTROS";
}

export function lineConfidence(parts: {
  date?: string;
  description?: string;
  amount?: number | null;
  ambiguous?: boolean;
}): number {
  let score = 40;
  if (parts.date) score += 25;
  if (parts.description && parts.description.length >= 3) score += 20;
  if (parts.amount != null && parts.amount !== 0) score += 15;
  if (parts.ambiguous) score -= 20;
  return Math.max(25, Math.min(score, 98));
}

export function makeTransactionLineId(rawLine: string): string {
  return `bs_${crypto.createHash("sha256").update(rawLine).digest("hex").slice(0, 12)}`;
}

export function splitStatementLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseStatementLine(rawLine: string): ExtractedBankStatementTransaction | null {
  const normalized = normalizeWhitespace(rawLine);
  if (!normalized || SKIP_LINE.test(normalized)) return null;

  const warnings: string[] = [];

  const columnMatch = normalized.match(COLUMN_LINE);
  if (columnMatch) {
    const date = normalizeDateToIso(columnMatch[1]!);
    const description = normalizeWhitespace(columnMatch[2]!);
    const documentNumber = columnMatch[3]!;
    const debit = columnMatch[4] !== "-" ? parseBrazilianAmount(columnMatch[4]!) : null;
    const credit = columnMatch[5] !== "-" ? parseBrazilianAmount(columnMatch[5]!) : null;
    const balanceAfter = parseBrazilianAmount(columnMatch[6]!) ?? undefined;

    const amount = debit != null && debit > 0 ? debit : credit != null && credit > 0 ? credit : null;
    if (amount == null || !description) return null;

    const direction: "INCOME" | "EXPENSE" = credit != null && credit > 0 ? "INCOME" : "EXPENSE";

    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      description,
      amount,
      direction,
      balanceAfter,
      documentNumber,
      method: detectTransactionMethod(description),
      rawLine: normalized,
      confidence: lineConfidence({ date: date ?? undefined, description, amount }),
      warnings,
    };
  }

  const dcMatch = normalized.match(DEBIT_CREDIT_LINE);
  if (dcMatch) {
    const date = normalizeDateToIso(dcMatch[1]!);
    const description = normalizeWhitespace(dcMatch[2]!);
    const amount = parseBrazilianAmount(dcMatch[4]!);
    if (amount == null || !description) return null;
    const isCredit = /^c/i.test(dcMatch[3]!);
    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      description,
      amount,
      direction: isCredit ? "INCOME" : "EXPENSE",
      method: detectTransactionMethod(description),
      rawLine: normalized,
      confidence: lineConfidence({ date: date ?? undefined, description, amount }),
      warnings,
    };
  }

  const simpleMatch = normalized.match(SIMPLE_LINE);
  if (simpleMatch) {
    const date = normalizeDateToIso(simpleMatch[1]!);
    const amountRaw = parseBrazilianAmount(simpleMatch[3]!);
    const description = normalizeWhitespace(simpleMatch[2]!);
    if (amountRaw == null || !description) return null;

    const negativeInText = simpleMatch[3]!.trim().startsWith("-");
    const direction =
      amountRaw < 0 || negativeInText
        ? "EXPENSE"
        : inferDirectionFromDescription(description, amountRaw);

    if (!date) warnings.push("Data inferida ou ausente");

    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      description,
      amount: Math.abs(amountRaw),
      direction,
      method: detectTransactionMethod(description),
      rawLine: normalized,
      confidence: lineConfidence({
        date: date ?? undefined,
        description,
        amount: amountRaw,
        ambiguous: !date,
      }),
      warnings,
    };
  }

  const dateMatch = normalized.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
  const amountMatch = normalized.match(/(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)/);
  if (dateMatch || amountMatch) {
    const date = dateMatch ? normalizeDateToIso(dateMatch[1]!) : null;
    const amount = amountMatch ? parseBrazilianAmount(amountMatch[0]) : null;
    if (amount == null) return null;

    warnings.push("Linha parseada com heurística genérica — revise descrição e valor");

    const description =
      normalizeWhitespace(
        normalized
          .replace(dateMatch?.[0] ?? "", "")
          .replace(amountMatch?.[0] ?? "", "")
          .replace(/\s+/g, " "),
      ) || normalized.slice(0, 140);

    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      description,
      amount: Math.abs(amount),
      direction: inferDirectionFromDescription(description, amount),
      method: detectTransactionMethod(description),
      rawLine: normalized,
      confidence: lineConfidence({
        date: date ?? undefined,
        description,
        amount,
        ambiguous: true,
      }),
      warnings,
    };
  }

  return null;
}

export function parseStatementLinesFromText(
  text: string,
  maxLines = 800,
): ExtractedBankStatementTransaction[] {
  const result: ExtractedBankStatementTransaction[] = [];
  for (const line of splitStatementLines(text).slice(0, maxLines)) {
    const parsed = parseStatementLine(line);
    if (parsed) result.push(parsed);
  }
  return result;
}

export type StatementMetadataExtractors = {
  account?: RegExp;
  branch?: RegExp;
  holderName?: RegExp;
  holderDocument?: RegExp;
  period?: RegExp;
};

export function extractStatementMetadata(
  text: string,
  extractors: StatementMetadataExtractors,
): Pick<ExtractedBankStatement, "account" | "branch" | "holderName" | "holderDocument" | "period"> {
  const normalized = text.replace(/\s+/g, " ");
  const meta: Pick<
    ExtractedBankStatement,
    "account" | "branch" | "holderName" | "holderDocument" | "period"
  > = {};

  if (extractors.account) {
    const match = normalized.match(extractors.account);
    if (match?.[1]) meta.account = match[1].trim();
  }
  if (extractors.branch) {
    const match = normalized.match(extractors.branch);
    if (match?.[1]) meta.branch = match[1].trim();
  }
  if (extractors.holderName) {
    const match = normalized.match(extractors.holderName);
    if (match?.[1]) meta.holderName = match[1].trim();
  }
  if (extractors.holderDocument) {
    const match = normalized.match(extractors.holderDocument);
    if (match?.[1]) meta.holderDocument = match[1].trim();
  }
  if (extractors.period) {
    const match = normalized.match(extractors.period);
    if (match?.[1] && match?.[2]) {
      meta.period = {
        start: normalizeDateToIso(match[1]) ?? undefined,
        end: normalizeDateToIso(match[2]) ?? undefined,
      };
    }
  }

  return meta;
}

export function aggregateStatementConfidence(
  transactions: ExtractedBankStatementTransaction[],
  warnings: string[],
): number {
  if (transactions.length === 0) return warnings.length > 0 ? 30 : 20;
  const avg =
    transactions.reduce((sum, tx) => sum + tx.confidence, 0) / Math.max(transactions.length, 1);
  return Math.max(25, Math.min(Math.round(avg - warnings.length * 3), 98));
}

export const STATEMENT_MARKERS =
  /extrato(?:\s+de\s+conta|\s+banc[aá]rio)?|saldo\s+(?:anterior|atual|final)|lan[cç]amentos?\s+do\s+per[ií]odo|conta\s+corrente|movimenta[cç][aã]o/i;

export const INVOICE_MARKERS =
  /fatura\s+(?:do\s+)?cart[aã]o|valor\s+(?:total\s+)?da\s+fatura|total\s+para\s+pr[oó]ximas\s+faturas|limite\s+utilizad/i;

export function isLikelyBankStatement(text: string): boolean {
  if (INVOICE_MARKERS.test(text) && !STATEMENT_MARKERS.test(text)) return false;
  return STATEMENT_MARKERS.test(text) || /\bd[eé]bito\b.*\bcr[eé]dito\b/i.test(text);
}

export function isLikelyCardInvoice(text: string): boolean {
  if (isLikelyBankStatement(text)) return false;
  return INVOICE_MARKERS.test(text) || /\d{2}\/\d{2}\s+.+\d{1,3}(?:\.\d{3})*,\d{2}/.test(text);
}
