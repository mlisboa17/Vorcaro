import {
  buildBankStatementLineFingerprint,
  normalizeDescriptionForFingerprint,
  type ExtractedBankStatement as ParserStatement,
  type ExtractedBankStatementTransaction as ParserTransaction,
} from "@/lib/bank-parsers";
import type {
  ExtractedBankStatementTransaction,
  FinancialDocumentBatchReview,
} from "../types/financial-document-import.types";

function buildImportSummary(
  transactions: ExtractedBankStatementTransaction[],
): FinancialDocumentBatchReview["importSummary"] {
  const recognized = transactions.filter((t) => t.parseStatus === "RECOGNIZED" || (!t.parseStatus && t.amount > 0)).length;
  const needsReview = transactions.filter((t) => t.parseStatus === "NEEDS_REVIEW").length;
  const errors = transactions.filter((t) => t.parseStatus === "ERROR").length;
  const ignored = transactions.filter((t) => t.parseStatus === "IGNORED").length;

  return {
    totalLines: transactions.length,
    recognized,
    needsReview,
    ignored,
    errors,
  };
}
export function mapParserTransactionToDomain(
  tx: ParserTransaction,
  options: { userId?: string; bank: string; account?: string },
): ExtractedBankStatementTransaction {
  const normalizedDescription = normalizeDescriptionForFingerprint(tx.description);
  const fingerprint =
    options.userId != null
      ? buildBankStatementLineFingerprint({
          userId: options.userId,
          bank: options.bank,
          account: options.account,
          date: tx.date,
          amount: tx.amount,
          normalizedDescription,
        })
      : undefined;

  return {
    id: fingerprint ? `line_${fingerprint.slice(0, 16)}` : `bs_${tx.rawLine.slice(0, 24)}`,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    direction: tx.direction,
    balanceAfter: tx.balanceAfter,
    documentNumber: tx.documentNumber,
    method: tx.method,
    rawLine: tx.rawLine,
    confidence: tx.confidence,
    fingerprint,
    suggestedCategoryId: tx.suggestedCategoryId,
    suggestedSubcategoryId: tx.suggestedSubcategoryId,
    warnings: tx.warnings,
    selected: tx.parseStatus === "NEEDS_REVIEW" || tx.parseStatus === "ERROR" ? false : true,
    parseStatus: tx.parseStatus,
    reviewMessage: tx.reviewMessage,
  };}

export function mapParserStatementToBatchReview(
  statement: ParserStatement,
  options: { userId?: string; cardId?: string | null },
): Pick<
  FinancialDocumentBatchReview,
  | "bank"
  | "profile"
  | "account"
  | "branch"
  | "holderName"
  | "period"
  | "warnings"
  | "bankStatementTransactions"
  | "importSummary"
> {
  const bank = statement.bank;
  const account = statement.account;

  return {
    bank,
    profile: statement.profile,
    account,
    branch: statement.branch,
    holderName: statement.holderName,
    period: statement.period
      ? {
          start: statement.period.start,
          end: statement.period.end,
        }
      : undefined,
    warnings: statement.warnings,
    bankStatementTransactions: statement.transactions.map((tx) =>
      mapParserTransactionToDomain(tx, { userId: options.userId, bank, account }),
    ),
    importSummary: buildImportSummary(
      statement.transactions.map((tx) =>
        mapParserTransactionToDomain(tx, { userId: options.userId, bank, account }),
      ),
    ),
  };}
