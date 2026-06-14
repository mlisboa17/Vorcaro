import { parsePdf } from "@/lib/parsers/pdf-parser";
import { PdfParseError, toPdfParseError } from "@/lib/parsers/pdf-import-errors";
import type { ImportedFinancialLine } from "@/modules/financial-inbox/domain/types/imported-financial-line";
import { resolveBankStatement } from "@/lib/bank-parsers";
import { isBradescoInvoiceText, parseBradescoInvoiceText, type BradescoInvoiceSummary } from "./bradesco-invoice-parser";
import { parseInstallmentStructure } from "@/lib/financial/installment-structural-parser";

export type { BradescoInvoiceSummary };

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDateToYyyyMmDd(value: string): string | null {
  const raw = value.trim();

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }

  const shortBr = raw.match(/^(\d{2})\/(\d{2})$/);
  if (shortBr) {
    const year = new Date().getFullYear();
    return `${year}-${shortBr[2]}-${shortBr[1]}`;
  }

  return null;
}

function safeNumber(value: string): number | null {
  if (normalizeDateToYyyyMmDd(value)) {
    return null;
  }

  const cleaned = value
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === ".") {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function linesFromPdfText(text: string, fileName: string): ImportedFinancialLine[] {
  if (isBradescoInvoiceText(text)) {
    return parseBradescoInvoiceText(text, fileName).lines;
  }

  const { statement } = resolveBankStatement(text);
  if (statement.transactions.length > 0) {
    return statement.transactions.map((tx) => ({
      date: tx.date,
      description: tx.description,
      amount: tx.direction === "EXPENSE" ? -tx.amount : tx.amount,
      rawContent: tx.rawLine,
    }));
  }

  const lines = splitLines(text);

  if (lines.length === 0) {
    return [
      {
        rawContent: `PDF sem texto extraível: ${fileName}`,
      },
    ];
  }

  const result: ImportedFinancialLine[] = [];

  for (const line of lines.slice(0, 800)) {
    // Exclude header/footer lines that are not transactions
    if (/^(fatura|limite|pagamento|resumo|saldo|total|vencimento)/i.test(line)) continue;

    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\b\d{2}\/\d{2}\b)/);
    const amountMatch = line.match(/(-?\d{1,3}(\.\d{3})*,\d{2}|-?\d+(\.\d+)?)/);

    const date = dateMatch ? normalizeDateToYyyyMmDd(dateMatch[1]) : null;
    const amount = amountMatch ? safeNumber(amountMatch[0]) : null;

    const isForeignCurrency = /(IOF|US\$|cotacao|cotação|conversão)/i.test(line);

    if (amount === null && date === null && !isForeignCurrency) {
      continue;
    }

    const description = normalizeWhitespace(line).slice(0, 140);
    const parsedInstallment = parseInstallmentStructure(description);

    result.push({
      date: date ?? undefined,
      amount: amount ?? undefined,
      description: parsedInstallment.descricaoBase || description || undefined,
      installment: parsedInstallment.hadInstallmentMarker ? parsedInstallment.numeroParcela : undefined,
      totalInstallments: parsedInstallment.hadInstallmentMarker ? parsedInstallment.totalParcelas : undefined,
      rawContent: normalizeWhitespace(line),
    });
  }

  return result;
}

export function extractBradescoSummaryFromPdfText(text: string): BradescoInvoiceSummary | null {
  if (!isBradescoInvoiceText(text)) return null;
  return parseBradescoInvoiceText(text, "bradesco.pdf").summary;
}

export async function parsePdfWithLocalExtraction(
  buffer: Buffer,
  fileName: string,
  password?: string,
): Promise<ImportedFinancialLine[]> {
  try {
    const text = await parsePdf(buffer, { pdfPassword: password });
    return linesFromPdfText(text, fileName);
  } catch (error) {
    throw toPdfParseError(error, Boolean(password?.trim()));
  }
}

export { PdfParseError };
