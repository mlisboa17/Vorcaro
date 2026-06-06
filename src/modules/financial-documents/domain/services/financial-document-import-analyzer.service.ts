import {
  isBradescoBankStatementText,
  isBradescoCardInvoiceText,
  parseBradescoBankStatementText,
} from "@/lib/inbox/bradesco-bank-statement-parser";
import { parseBradescoInvoiceText } from "@/lib/inbox/bradesco-invoice-parser";
import { extractInstallmentPurchasesFromLines } from "../services/card-invoice-installment-parser.service";
import type {
  ExtractedBankStatementTransaction,
  ExtractedInstallmentPurchase,
  FinancialDocumentBatchReview,
  FinancialDocumentImportKind,
} from "../types/financial-document-import.types";

export function analyzeFinancialDocumentText(
  text: string,
  options?: { userId?: string; cardId?: string | null; fileName?: string },
): FinancialDocumentBatchReview {
  const fileName = options?.fileName ?? "documento";

  if (isBradescoBankStatementText(text)) {
    const bankStatementTransactions = parseBradescoBankStatementText(text);
    if (bankStatementTransactions.length > 1) {
      return {
        documentKind: "BANK_STATEMENT",
        bankStatementTransactions,
        installmentPurchases: [],
        batchReviewRequired: true,
      };
    }
  }

  if (isBradescoCardInvoiceText(text)) {
    const parsed = parseBradescoInvoiceText(text, fileName);
    const installmentPurchases = extractInstallmentPurchasesFromLines(parsed.lines, {
      userId: options?.userId,
      cardId: options?.cardId,
      cardName: "Bradesco",
    });

    if (parsed.lines.length > 1 || installmentPurchases.length > 0) {
      const bankStatementTransactions: ExtractedBankStatementTransaction[] = parsed.lines
        .filter((line) => line.amount != null && line.description)
        .map((line) => ({
          id: `ci_${line.rawContent.slice(0, 40)}`,
          date: line.date ?? new Date().toISOString().slice(0, 10),
          description: line.description!,
          amount: Math.abs(line.amount!),
          direction: "EXPENSE" as const,
          method: "CARTAO_CREDITO" as const,
          confidence: line.installment ? 90 : 75,
          selected: true,
        }));

      return {
        documentKind: "CARD_INVOICE",
        bankStatementTransactions,
        installmentPurchases,
        batchReviewRequired: true,
      };
    }
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
    bankStatementTransactions: Array.isArray(data.bankStatementTransactions)
      ? (data.bankStatementTransactions as ExtractedBankStatementTransaction[])
      : [],
    installmentPurchases: Array.isArray(data.installmentPurchases)
      ? (data.installmentPurchases as ExtractedInstallmentPurchase[])
      : [],
    batchReviewRequired: data.batchReviewRequired === true,
  };
}
