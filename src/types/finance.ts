export type TransactionTypeIndicator = 'C' | 'D';

export interface StatementItem {
  id: string;
  date: Date;
  description: string;
  type: TransactionTypeIndicator;
  amount: number;
  cnpjCpf?: string | null;
  suggestedName?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  categoryName?: string | null;
  accountName?: string | null;
}

export interface CardStatementItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  cardId: string;
  cardName?: string;
  categoryId?: string | null;
}

export type ReceiptStatus = 'PROCESSING' | 'READY' | 'DUPLICATED' | 'ERROR';

export interface ExtractedReceiptData {
  favorecido?: string;
  cnpjCpf?: string;
  value?: number;
  date?: string;
}

export interface ReceiptItem {
  id: string;
  fileName: string;
  status: ReceiptStatus;
  url: string;
  extractedData?: ExtractedReceiptData;
}
