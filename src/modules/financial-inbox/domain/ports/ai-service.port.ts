export type ExtractedTransactionType = "EXPENSE" | "INCOME" | "TRANSFER" | "UNKNOWN";

export type ExtractedPaymentMethodType =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "BOLETO"
  | "TRANSFERENCIA_BANCARIA"
  | "CARTEIRA_DIGITAL"
  | "DEBITO_AUTOMATICO"
  | "OTHER"
  | null;

export type ExtractedCardBrand =
  | "VISA"
  | "MASTERCARD"
  | "ELO"
  | "AMEX"
  | "HIPERCARD"
  | "OTHER"
  | null;

export interface FinancialExtraction {
  type: ExtractedTransactionType;
  amount: number | null;
  description: string | null;
  category: string | null;
  categoriaPrincipal?: string | null;
  subcategoria?: string | null;
  date: string | null;
  paymentMethod: string | null;
  paymentMethodType: ExtractedPaymentMethodType;
  financialInstitution: string | null;
  cardLastFourDigits: string | null;
  cardBrand: ExtractedCardBrand;
  installments: number | null;
  confidence: Record<string, number>;
  missingFields: string[];
  followUpQuestion: string | null;
  financialAccountId?: string | null;
  paymentMethodId?: string | null;
  cardId?: string | null;
  categoryId?: string | null;
}

export interface AIExtractionMetadata {
  provider: string;
  tokensUsed?: number;
  processingMs?: number;
}

export interface MediaAttachment {
  type: "image" | "audio";
  mimeType: string;
  base64: string;
}

export interface AIExtractionOptions {
  referenceDate?: Date;
  media?: MediaAttachment;
}

export interface AIServicePort {
  extract(
    rawContent: string,
    options?: AIExtractionOptions,
  ): Promise<{ data: FinancialExtraction; metadata: AIExtractionMetadata }>;

  transcribeAudio(media: MediaAttachment): Promise<string>;
}
