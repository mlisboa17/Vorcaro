export type ExtractedBankStatementTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "INCOME" | "EXPENSE";
  balanceAfter?: number;
  documentNumber?: string;
  method?: "PIX" | "TRANSFERENCIA" | "BOLETO" | "CARTAO_CREDITO" | "OUTROS";
  confidence: number;
  selected?: boolean;
  rejected?: boolean;
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
};

export type FinancialDocumentImportKind = "BANK_STATEMENT" | "CARD_INVOICE" | "SINGLE_RECEIPT";

export type FinancialDocumentBatchReview = {
  documentKind: FinancialDocumentImportKind;
  bankStatementTransactions: ExtractedBankStatementTransaction[];
  installmentPurchases: ExtractedInstallmentPurchase[];
  batchReviewRequired: boolean;
};
