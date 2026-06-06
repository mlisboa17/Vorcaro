import type { ExtractedBankStatementTransaction } from "@/modules/financial-documents/domain/types/financial-document-import.types";

import {

  bradescoParsedLineToTransaction,

  parseBradescoStatementFull,

} from "./bradesco-statement-line-parser";



const BRADESCO_MARKERS = /\bbradesco\b/i;



const STATEMENT_MARKERS =

  /extrato(?:\s+de\s+conta|\s+banc[aá]rio|\s+empresarial)?|saldo\s+(?:anterior|atual|final)|lan[cç]amentos?\s+do\s+per[ií]odo|conta\s+(?:corrente|empresarial)/i;



const INVOICE_MARKERS =

  /fatura\s+(?:do\s+)?cart[aã]o|valor\s+(?:total\s+)?da\s+fatura|total\s+para\s+pr[oó]ximas\s+faturas|limite\s+utilizad/i;



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



export function parseBradescoBankStatementText(text: string): ExtractedBankStatementTransaction[] {

  return parseBradescoBankStatementWithStatus(text);

}



export function parseBradescoBankStatementWithStatus(text: string): ExtractedBankStatementTransaction[] {

  const result = parseBradescoStatementFull(text);

  return result.lines

    .filter((line) => line.parseStatus !== "IGNORED")

    .map(bradescoParsedLineToTransaction);

}



export { parseBradescoStatementFull } from "./bradesco-statement-line-parser";


