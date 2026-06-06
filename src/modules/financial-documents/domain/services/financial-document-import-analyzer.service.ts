import { isLikelyCardInvoice, resolveBankStatement } from "@/lib/bank-parsers";
import { parseBradescoInvoiceText } from "@/lib/inbox/bradesco-invoice-parser";
import {
  isBradescoBankStatementText,
  isBradescoCardInvoiceText,
} from "@/lib/inbox/bradesco-bank-statement-parser";
import { parseBradescoStatementFull } from "@/lib/inbox/bradesco-statement-line-parser";
import { extractInstallmentPurchasesFromLines } from "../services/card-invoice-installment-parser.service";
import { mapParserStatementToBatchReview } from "./bank-statement-batch.mapper";
import type {
  ExtractedBankStatementTransaction,
  FinancialDocumentBatchReview,
  FinancialDocumentImportKind,
} from "../types/financial-document-import.types";

function analyzeCardInvoice(
  text: string,
  options?: { userId?: string; cardId?: string | null; fileName?: string },
): FinancialDocumentBatchReview | null {
  const fileName = options?.fileName ?? "documento";
  const isBradescoInvoice =
    isBradescoCardInvoiceText(text) || (isLikelyCardInvoice(text) && /\bbradesco\b/i.test(text));

  if (!isBradescoInvoice) return null;

  const parsed = parseBradescoInvoiceText(text, fileName);
  const installmentPurchases = extractInstallmentPurchasesFromLines(parsed.lines, {
    userId: options?.userId,
    cardId: options?.cardId,
    cardName: "Bradesco",
  });

  if (parsed.lines.length <= 1 && installmentPurchases.length === 0) return null;

  const bankStatementTransactions: ExtractedBankStatementTransaction[] = parsed.lines
    .filter((line) => line.amount != null && line.description)
    .map((line) => ({
      id: `ci_${line.rawContent.slice(0, 40)}`,
      date: line.date ?? new Date().toISOString().slice(0, 10),
      description: line.description!,
      amount: Math.abs(line.amount!),
      direction: "EXPENSE" as const,
      method: "CARTAO_CREDITO" as const,
      rawLine: line.rawContent,
      confidence: line.installment ? 90 : 75,
      warnings: [],
      selected: true,
    }));

  return {
    documentKind: "CARD_INVOICE",
    bank: "Bradesco",
    bankStatementTransactions,
    installmentPurchases,
    batchReviewRequired: true,
  };
}

export function analyzeFinancialDocumentText(
  text: string,
  options?: { userId?: string; cardId?: string | null; fileName?: string },
): FinancialDocumentBatchReview {
  const cardInvoice = analyzeCardInvoice(text, options);
  if (cardInvoice) return cardInvoice;

  const { statement, usedGenericFallback } = resolveBankStatement(text);
  const mapped = mapParserStatementToBatchReview(statement, {
    userId: options?.userId,
    cardId: options?.cardId,
  });

  if (isBradescoBankStatementText(text)) {
    const bradescoFull = parseBradescoStatementFull(text);
    if (mapped.importSummary) {
      mapped.importSummary = {
        ...mapped.importSummary,
        totalLines: bradescoFull.summary.total,
        recognized: bradescoFull.summary.recognized,
        needsReview: bradescoFull.summary.needsReview,
        ignored: bradescoFull.summary.ignored,
        errors: bradescoFull.summary.errors,
        processedInChunks: bradescoFull.processedInChunks,
      };
    }
    if (bradescoFull.processedInChunks) {
      mapped.warnings = [
        ...(mapped.warnings ?? []),
        `Extrato longo detectado — processado em ${bradescoFull.chunkCount} blocos para maior precisão.`,
      ];
    }
    if (bradescoFull.summary.needsReview > 0) {
      mapped.warnings = [
        ...(mapped.warnings ?? []),
        `${bradescoFull.summary.needsReview} lançamento(s) precisam de revisão manual antes de importar.`,
      ];
    }
  }

  const importableCount = mapped.bankStatementTransactions.filter(
    (line) => line.parseStatus !== "IGNORED",
  ).length;

  if (
    importableCount > 1 ||
    (mapped.importSummary?.needsReview ?? 0) > 0 ||
    (mapped.importSummary?.errors ?? 0) > 0
  ) {    return {
      documentKind: "BANK_STATEMENT",
      ...mapped,
      installmentPurchases: [],
      batchReviewRequired: true,
      usedGenericParser: usedGenericFallback,
    };
  }

  return {
    documentKind: "SINGLE_RECEIPT",
    bankStatementTransactions: [],
    installmentPurchases: [],
    batchReviewRequired: false,
  };
}

export function readBatchReviewFromJson(source: unknown): FinancialDocumentBatchReview | null {
  if (!source || typeof source !== "object") return null;
  const data = source as Partial<FinancialDocumentBatchReview>;
  if (!data.documentKind) return null;
  return {
    documentKind: data.documentKind as FinancialDocumentImportKind,
    bank: data.bank,
    profile: data.profile,
    account: data.account,
    branch: data.branch,
    holderName: data.holderName,
    period: data.period,
    warnings: Array.isArray(data.warnings) ? data.warnings : undefined,
    bankStatementTransactions: Array.isArray(data.bankStatementTransactions)
      ? (data.bankStatementTransactions as ExtractedBankStatementTransaction[])
      : [],
    installmentPurchases: Array.isArray(data.installmentPurchases)
      ? (data.installmentPurchases as FinancialDocumentBatchReview["installmentPurchases"])
      : [],
    batchReviewRequired: data.batchReviewRequired === true,
    usedGenericParser: data.usedGenericParser === true,
    layoutTraining:
      data.layoutTraining && typeof data.layoutTraining === "object"
        ? (data.layoutTraining as FinancialDocumentBatchReview["layoutTraining"])
        : undefined,
    importSummary:
      data.importSummary && typeof data.importSummary === "object"
        ? (data.importSummary as FinancialDocumentBatchReview["importSummary"])
        : undefined,
  };}
