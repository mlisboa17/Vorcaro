export type BankStatementLineParseStatus = "RECOGNIZED" | "NEEDS_REVIEW" | "IGNORED" | "ERROR";

export type ExtractedBankStatementTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "INCOME" | "EXPENSE";
  balanceAfter?: number;
  documentNumber?: string;
  method?: "PIX" | "TRANSFERENCIA" | "BOLETO" | "CARTAO_CREDITO" | "TARIFA" | "OUTROS";
  rawLine?: string;
  confidence: number;
  fingerprint?: string;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
  warnings?: string[];
  selected?: boolean;
  rejected?: boolean;
  parseStatus?: BankStatementLineParseStatus;
  reviewMessage?: string;
};
export type ExtractedInstallmentPurchase = {
  id: string;
  merchant: string;
  purchaseDate?: string;
  currentInstallment: number;
  totalInstallments: number;
  installmentAmount: number;
  totalAmount?: number;
  cardName?: string;
  dueDate?: string;
  confidence: number;
  fingerprint?: string;
  rawLine?: string;
};

export type FinancialDocumentImportKind = "BANK_STATEMENT" | "CARD_INVOICE" | "SINGLE_RECEIPT";

export type FinancialDocumentBatchReview = {
  documentKind: FinancialDocumentImportKind;
  bank?: string;
  profile?: "PF" | "PJ" | "UNKNOWN";
  account?: string;
  branch?: string;
  holderName?: string;
  period?: { start?: string; end?: string };
  warnings?: string[];
  bankStatementTransactions: ExtractedBankStatementTransaction[];
  installmentPurchases: ExtractedInstallmentPurchase[];
  batchReviewRequired: boolean;
  usedGenericParser?: boolean;
  layoutTraining?: {
    modelId: string | null;
    modelVersion: number | null;
    layoutLabel: string | null;
    similarityScore: number;
    similarityTier: "HIGH" | "MEDIUM" | "LOW";
    isNewModel?: boolean;
    message?: string;
  };
  importSummary?: {
    totalLines: number;
    recognized: number;
    needsReview: number;
    ignored: number;
    errors: number;
    processedInChunks?: boolean;
  };
};