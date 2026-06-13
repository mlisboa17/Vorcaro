import * as xlsx from "xlsx";
import { createHash } from "crypto";
import type {
  ExtractedBankStatement,
  ExtractedBankStatementTransaction,
  BankStatementParser,
} from "../bank-statement-parser.types";

export class DynamicCsvParser implements BankStatementParser {
  bankName = "Desconhecido";
  bankId = "GENERIC_CSV";
  profile = "UNKNOWN" as const;

  canParse(text: string): boolean {
    // Basic check if it's likely a CSV
    return text.includes(",") || text.includes(";");
  }

  public parse(content: string): ExtractedBankStatement {
    const warnings: string[] = [];
    const transactions: ExtractedBankStatementTransaction[] = [];

    // Parse CSV to array of arrays using XLSX
    const workbook = xlsx.read(content, { type: "string", raw: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

    // 1. Encontrar a linha de cabeçalho
    let headerRowIndex = -1;
    let colDate = -1;
    let colDesc = -1;
    let colAmount = -1;
    let colId = -1;

    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
      const row = rawRows[i].map((c) => String(c).toLowerCase().trim());

      const dateIdx = row.findIndex(
        (c) => c.includes("data") || c === "lançamento" || c === "date"
      );
      const descIdx = row.findIndex(
        (c) =>
          c.includes("descri") ||
          c.includes("histórico") ||
          c.includes("historico") ||
          c === "detalhes" ||
          c === "lançamento"
      );
      const amountIdx = row.findIndex(
        (c) => c.includes("valor") || c === "amount" || c === "quantia"
      );
      const idIdx = row.findIndex(
        (c) => c.includes("identificador") || c === "id" || c.includes("transação")
      );

      // Precisamos de data e pelo menos (descrição ou valor) para confiar que é o header
      if (dateIdx !== -1 && (descIdx !== -1 || amountIdx !== -1)) {
        headerRowIndex = i;
        colDate = dateIdx;
        colDesc = descIdx !== -1 && descIdx !== dateIdx ? descIdx : -1;
        colAmount = amountIdx;
        colId = idIdx;
        break;
      }
    }

    if (headerRowIndex === -1 || colDate === -1 || colAmount === -1) {
      throw new Error("Não foi possível identificar o cabeçalho do CSV (Data e Valor são obrigatórios).");
    }

    // Processar as linhas de transação
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || !row.some(Boolean)) continue;

      const rawDate = colDate !== -1 ? String(row[colDate] || "").trim() : "";
      const rawDesc = colDesc !== -1 ? String(row[colDesc] || "").trim() : "Transação via CSV";
      const rawAmount = colAmount !== -1 ? String(row[colAmount] || "").trim() : "0";
      const rawId = colId !== -1 ? String(row[colId] || "").trim() : undefined;

      if (!rawDate || !rawAmount) continue;

      const parsedDate = this.parseDate(rawDate);
      if (!parsedDate) {
        warnings.push(`Data inválida na linha ${i + 1}: ${rawDate}`);
        continue;
      }

      const amount = this.parseAmount(rawAmount);
      if (isNaN(amount) || amount === 0) continue;

      const direction = amount >= 0 ? "INCOME" : "EXPENSE";

      // MD5 Fallback para deduplicação (Garante idempotência do envio)
      const fitId = rawId || this.generateFingerprint(parsedDate, rawDesc, amount);

      transactions.push({
        date: parsedDate,
        description: rawDesc,
        amount: Math.abs(amount),
        direction,
        fingerprint: fitId,
        rawLine: row.join(","),
        confidence: colId !== -1 ? 0.9 : 0.7,
        warnings: [],
      });
    }

    return {
      bank: "GENERIC_CSV",
      profile: "UNKNOWN",
      transactions,
      confidence: 0.8,
      warnings,
    };
  }

  private generateFingerprint(date: string, desc: string, amount: number): string {
    const raw = `${date}|${desc}|${amount}`;
    return createHash("md5").update(raw).digest("hex");
  }

  private parseAmount(val: string): number {
    let cleaned = val.replace(/[R$\s]/g, "");

    // Padrão Brasileiro (ex: 1.234,56 ou 12,50)
    if (cleaned.match(/\d+\.\d{3},\d{2}/) || cleaned.match(/\d+,\d{2}$/)) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }

    return parseFloat(cleaned);
  }

  private parseDate(val: string): string | null {
    // DD/MM/YYYY
    const brMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T12:00:00-03:00`;
    }
    // YYYY-MM-DD
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00-03:00`;
    }
    return null;
  }
}
