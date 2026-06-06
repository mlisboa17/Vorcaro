import type { FinancialDocumentStatus, TransactionMethod } from "@prisma/client";

export const ALLOWED_DOCUMENT_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type ParsedFinancialFields = {
  amount?: number;
  date?: Date;
  description?: string;
  supplier?: string;
  pixKey?: string;
  documentNumber?: string;
  cpfCnpj?: string;
  bank?: string;
  agency?: string;
  account?: string;
  barcode?: string;
  cardLastDigits?: string;
  payerName?: string;
  payerDocument?: string;
  payerBank?: string;
  payerAgency?: string;
  payerAccount?: string;
  payeeName?: string;
  receiverName?: string;
  receiverDocument?: string;
  receiverBank?: string;
  receiverAgency?: string;
  receiverAccount?: string;
};

export type ParsedFinancialDocument = {
  method: TransactionMethod;
  fields: ParsedFinancialFields;
  rawMatches: Record<string, string>;
};

export type ClassificationResult = {
  categoryId: string | null;
  subcategoryId: string | null;
  confidence: number;
  isLearnedPattern: boolean;
  source:
    | "learned_pix_key"
    | "learned_document_number"
    | "learned_name"
    | "user_rule"
    | "system_rule"
    | "default_taxonomy"
    | "pending";
};

export type DocumentUploadInput = {
  userId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  source?: "WEB" | "TELEGRAM";
};

export type DocumentListFilters = {
  status?: FinancialDocumentStatus;
  limit?: number;
};

export type SuggestionEditInput = {
  amount?: number;
  date?: string;
  description?: string;
  supplier?: string;
  categoryId?: string;
  subcategoryId?: string;
  accountId?: string;
};

export type DocumentWithSuggestion = {
  id: string;
  fileName: string;
  mimeType: string;
  status: FinancialDocumentStatus;
  method: TransactionMethod | null;
  createdAt: Date;
  suggestion?: {
    id: string;
    status: string;
    amount: number | null;
    date: Date | null;
    description: string | null;
    supplier: string | null;
    method: TransactionMethod | null;
    categoryId: string | null;
    subcategoryId: string | null;
    confidence: number;
    isLearnedPattern: boolean;
  };
};
