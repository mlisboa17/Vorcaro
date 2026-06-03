import type { ImportedFinancialLine } from "@/modules/financial-inbox/domain/types/imported-financial-line";
import { parseInstallmentStructure } from "@/lib/financial/installment-structural-parser";

export type BradescoInvoiceSummary = {
  totalProximasFaturas?: number;
  valorFatura?: number;
  limiteUtilizado?: number;
};

export type BradescoParseResult = {
  lines: ImportedFinancialLine[];
  summary: BradescoInvoiceSummary;
};

const BRADESCO_MARKERS = /\bbradesco\b/i;

const SUMMARY_PATTERNS: Array<{
  key: keyof BradescoInvoiceSummary;
  regex: RegExp;
}> = [
  {
    key: "totalProximasFaturas",
    regex: /total\s+para\s+pr[oó]ximas\s+faturas[:\s]*(?:r\$\s*)?([\d.,]+)/i,
  },
  {
    key: "valorFatura",
    regex: /valor\s+(?:total\s+)?da\s+fatura[:\s]*(?:r\$\s*)?([\d.,]+)/i,
  },
  {
    key: "limiteUtilizado",
    regex: /limite\s+utilizad[oa][:\s]*(?:r\$\s*)?([\d.,]+)/i,
  },
];

const SKIP_LINE =
  /^(data|lan[cç]amento|estabelecimento|valor|total|resumo|saldo|pagamento|vencimento|limite|fatura|bradesco|visa|master|elo|amex|extrato)/i;

const KNOWN_TWO_WORD_CITIES = new Set([
  "SAO PAULO",
  "RIO DE JANEIRO",
  "BELO HORIZONTE",
  "PORTO ALEGRE",
  "FOZ DO IGUACU",
  "CAMPOS DOS GOYTACAZES",
]);

const KNOWN_SINGLE_CITIES = new Set([
  "RECIFE",
  "SERRA",
  "OSASCO",
  "JUNDIAI",
  "OLINDA",
  "CURITIBA",
  "BRASILIA",
  "GOIANIA",
  "MANAUS",
  "SALVADOR",
  "FORTALEZA",
  "CAMPINAS",
  "GUARULHOS",
  "SP",
  "RJ",
  "MG",
  "PR",
  "SC",
  "RS",
  "DF",
  "GO",
  "BA",
  "PE",
  "CE",
  "PA",
  "AM",
  "ES",
  "MT",
  "MS",
  "RO",
  "AC",
  "AP",
  "RR",
  "TO",
  "PI",
  "MA",
  "RN",
  "PB",
  "SE",
  "AL",
]);

const AMOUNT_AT_END = /(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*$/;
const TRANSACTION_LINE =
  /^(\d{2}\/\d{2})(?:\/\d{4})?\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*$/;

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

function normalizePurchaseDate(value: string): string | null {
  const br = value.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (!br) return null;
  const year = br[3] ?? String(new Date().getFullYear());
  return `${year}-${br[2]}-${br[1]}`;
}

function splitCamelCase(value: string): string {
  return value
    .replace(/([a-záéíóúãõâêôç])([A-ZÁÉÍÓÚÃÕÂÊÔÇ])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-záéíóúãõâêôç])/g, "$1 $2");
}

export function isBradescoInvoiceText(text: string): boolean {
  return BRADESCO_MARKERS.test(text);
}

export function extractBradescoInvoiceSummary(text: string): BradescoInvoiceSummary {
  const flat = normalizeWhitespace(text);
  const summary: BradescoInvoiceSummary = {};

  for (const { key, regex } of SUMMARY_PATTERNS) {
    const match = flat.match(regex);
    if (!match?.[1]) continue;
    const amount = parseBrazilianAmount(match[1]);
    if (amount !== null) summary[key] = amount;
  }

  return summary;
}

function extractTrailingCity(words: string[]): { descriptionWords: string[]; city?: string } {
  const descriptionWords = [...words];

  if (descriptionWords.length >= 2) {
    const twoWordCity = `${descriptionWords[descriptionWords.length - 2]!} ${descriptionWords[descriptionWords.length - 1]!}`.toUpperCase();
    if (KNOWN_TWO_WORD_CITIES.has(twoWordCity)) {
      return {
        descriptionWords: descriptionWords.slice(0, -2),
        city: twoWordCity,
      };
    }
  }

  if (descriptionWords.length >= 1) {
    const singleCity = descriptionWords[descriptionWords.length - 1]!.toUpperCase();
    if (KNOWN_SINGLE_CITIES.has(singleCity)) {
      return {
        descriptionWords: descriptionWords.slice(0, -1),
        city: singleCity,
      };
    }
  }

  return { descriptionWords };
}

/**
 * Separa descrição, parcela (parcelaAtual/totalParcelas) e cidade.
 * Remove marcadores como C05/05, 02/12 ou OneHeal01/12 (colados).
 */
export function normalizeBradescoDescription(rawDescription: string): {
  description: string;
  installment?: number;
  totalInstallments?: number;
  city?: string;
} {
  const text = normalizeWhitespace(rawDescription);
  if (!text) {
    return { description: "" };
  }

  const purchasePrefix = text.match(/^(\d{2}\/\d{2})(?:\/\d{4})?\s+/)?.[0]?.length ?? 0;
  const source = purchasePrefix > 0 ? text.slice(purchasePrefix).trim() : text;
  const parsed = parseInstallmentStructure(source);
  const description = splitCamelCase(parsed.descricaoBase || source);
  const words = description.split(/\s+/).filter(Boolean);
  const { descriptionWords, city } = extractTrailingCity(words);

  return {
    description: normalizeWhitespace(descriptionWords.join(" ")),
    installment: parsed.hadInstallmentMarker ? parsed.numeroParcela : undefined,
    totalInstallments: parsed.hadInstallmentMarker ? parsed.totalParcelas : undefined,
    city,
  };
}

function parseTransactionLine(line: string): ImportedFinancialLine | null {
  const normalized = normalizeWhitespace(line);
  if (!normalized || SKIP_LINE.test(normalized)) return null;
  if (SUMMARY_PATTERNS.some(({ regex }) => regex.test(normalized))) return null;

  const structured = normalized.match(TRANSACTION_LINE);
  if (structured) {
    const date = normalizePurchaseDate(structured[1]!);
    const amount = parseBrazilianAmount(structured[3]!);
    const desc = normalizeBradescoDescription(structured[2]!);

    if (!desc.description && amount === null) return null;

    return {
      date: date ?? undefined,
      amount: amount ?? undefined,
      description: desc.description || undefined,
      installment: desc.installment,
      totalInstallments: desc.totalInstallments,
      city: desc.city,
      rawContent: normalized,
    };
  }

  const amountMatch = normalized.match(AMOUNT_AT_END);
  if (!amountMatch) return null;

  const amount = parseBrazilianAmount(amountMatch[1]!);
  const head = normalized.slice(0, amountMatch.index).trim();
  const dateMatch = head.match(/^(\d{2}\/\d{2})(?:\/\d{4})?\s+(.*)$/);
  const date = dateMatch ? normalizePurchaseDate(dateMatch[1]!) : null;
  const descSource = dateMatch?.[2] ?? head;
  const desc = normalizeBradescoDescription(descSource);

  if (!desc.description) return null;

  return {
    date: date ?? undefined,
    amount: amount ?? undefined,
    description: desc.description,
    installment: desc.installment,
    totalInstallments: desc.totalInstallments,
    city: desc.city,
    rawContent: normalized,
  };
}

export function parseBradescoInvoiceText(text: string, fileName: string): BradescoParseResult {
  const summary = extractBradescoInvoiceSummary(text);
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ImportedFinancialLine[] = [];

  for (const line of lines.slice(0, 800)) {
    const parsed = parseTransactionLine(line);
    if (parsed) result.push(parsed);
  }

  if (result.length === 0) {
    return {
      summary,
      lines: [
        {
          rawContent: `PDF Bradesco sem lançamentos estruturados: ${fileName}`,
        },
      ],
    };
  }

  return { lines: result, summary };
}

export function countBradescoInstallments(lines: ImportedFinancialLine[]): number {
  return lines.filter((line) => line.installment != null && line.totalInstallments != null).length;
}
