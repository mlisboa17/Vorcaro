export type ImportFinancialFileType = "EXTRATO_BANCARIO" | "FATURA_CARTAO";

export type CategorySuggestionConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ImportLineParseStatus = "RECOGNIZED" | "NEEDS_REVIEW" | "IGNORED" | "ERROR";

export type ImportedFinancialLine = {
  externalId?: string;
  date?: string;
  description?: string;
  amount?: number;
  rawContent: string;
  installment?: number;
  totalInstallments?: number;
  city?: string;
  parseStatus?: ImportLineParseStatus;
  reviewMessage?: string;
};

export type DetectedCardInfo = {
  bank: string | null;
  brand: string | null;
  lastFourDigits: string | null;
  displayName: string | null;
};

export type MatchedCardInfo = DetectedCardInfo & {
  cardId: string | null;
  exists: boolean;
  cardName: string | null;
};

export type CategorySuggestion = {
  categoryId: string | null;
  categoryName: string | null;
  categoriaPrincipal: string | null;
  subcategoria: string | null;
  confidence: CategorySuggestionConfidence;
};
