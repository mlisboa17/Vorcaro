import { parseBradescoBankStatementWithStatus } from "@/lib/inbox/bradesco-bank-statement-parser";import type { ExtractedBankStatementTransaction } from "../bank-statement-parser.types";
import { createProfileBankParsers } from "../create-profile-bank-parser";

function mapBradescoTransactions(text: string): ExtractedBankStatementTransaction[] {
  return parseBradescoBankStatementWithStatus(text).map((tx) => ({
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    direction: tx.direction,
    balanceAfter: tx.balanceAfter,
    documentNumber: tx.documentNumber,
    method: tx.method,
    rawLine: tx.rawLine ?? `${tx.date} ${tx.description}`,
    confidence: tx.confidence,
    warnings: tx.warnings ?? [],
    parseStatus: tx.parseStatus,
    reviewMessage: tx.reviewMessage,
  }));
}

const { pf, pj } = createProfileBankParsers({
  bankName: "Bradesco",
  bankId: "bradesco",
  identityMarkers: [/\bbradesco\b/i],
  pfExtraMarkers: [/cpf|titular|conta\s+corrente/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|extrato\s+empresarial|empresarial/i],
  parseLines: mapBradescoTransactions,
  pfParseLines: mapBradescoTransactions,
  pjParseLines: mapBradescoTransactions,
});

export const bradescoPfParser = pf;
export const bradescoPjParser = pj;
