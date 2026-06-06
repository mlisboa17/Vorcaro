import * as XLSX from "xlsx";
import type { ImportedFinancialLine } from "@/modules/financial-inbox/domain/types/imported-financial-line";
import {
  enrichImportedLines,
  isLikelyCsvHeader,
  normalizeImportDate,
  parseCsvRow,
  parseStructuredAmount,
} from "./structured-bank-import.parser";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseCsvBankStatement(buffer: Buffer): ImportedFinancialLine[] {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = splitLines(text);
  if (lines.length === 0) return [];

  const delimiter = lines[0]!.includes(";") ? ";" : lines[0]!.includes("\t") ? "\t" : ",";
  const rows = lines.filter((line, index) => !(index === 0 && isLikelyCsvHeader(line)));

  return enrichImportedLines(rows.map((line) => parseCsvRow(line, delimiter)));
}

export function parseOfxBankStatement(buffer: Buffer): ImportedFinancialLine[] {
  const text = buffer.toString("utf-8");
  const blocks = text.split(/<STMTTRN>/gi).slice(1);
  const result: ImportedFinancialLine[] = [];

  for (const block of blocks) {
    const dtposted = block.match(/<DTPOSTED>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const trnamt = block.match(/<TRNAMT>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const fitid = block.match(/<FITID>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const name = block.match(/<NAME>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const memo = block.match(/<MEMO>([^<\n\r]+)/i)?.[1]?.trim() ?? "";

    const date = normalizeImportDate(dtposted);
    const amount = parseStructuredAmount(trnamt);
    const description = normalizeWhitespace(memo || name || "Lançamento OFX");
    const rawContent = normalizeWhitespace(
      [date ?? dtposted, description, amount !== null ? String(amount) : trnamt].filter(Boolean).join(" | "),
    );

    result.push({
      externalId: fitid || undefined,
      date: date ?? undefined,
      amount: amount ?? undefined,
      description,
      rawContent,
    });
  }

  return enrichImportedLines(result);
}

export function parseExcelBankStatement(buffer: Buffer): ImportedFinancialLine[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const result: ImportedFinancialLine[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!Array.isArray(row) || row.length === 0) continue;

    const cells = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    if (cells.length === 0) continue;

    const joined = cells.join(" | ");
    if (index === 0 && isLikelyCsvHeader(joined)) continue;

    const delimiter = joined.includes(";") ? ";" : joined.includes("\t") ? "\t" : "|";
    result.push(parseCsvRow(cells.join(delimiter === "|" ? " | " : delimiter), delimiter === "|" ? ";" : delimiter));
  }

  return enrichImportedLines(result);
}
