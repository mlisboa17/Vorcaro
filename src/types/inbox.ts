import type { InboxChannel, InboxStatus } from "@prisma/client";
import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import type { ExtractionConfidence } from "@/modules/shared/domain/confidence";
import type { InboxImportMetadata } from "@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema";

export interface InboxItem {
  id: string;
  userId: string;
  status: InboxStatus;
  channel: InboxChannel;
  rawContent: string;
  channelMeta: Record<string, unknown> | null;
  metadata: InboxImportMetadata | null;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxListResponse {
  items: InboxItem[];
  total: number;
}

export interface InboxDetailResponse {
  item: InboxItem;
  extractionResult: {
    id: string;
    extractedData: FinancialExtraction;
    confidence: ExtractionConfidence;
    provider: string;
  } | null;
}

export interface FinanceAccount {
  id: string;
  name: string;
  institutionName?: string | null;
  type: string;
  currency?: string;
  isActive?: boolean;
}

export interface FinanceCard {
  id: string;
  name: string;
  institutionName?: string | null;
  brand: string;
  type: string;
  lastFourDigits?: string | null;
  financialAccountId?: string | null;
  isActive?: boolean;
}

export interface FinancePaymentMethod {
  id: string;
  name: string;
  type: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: string;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

export interface FinanceCatalog {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  paymentMethods: FinancePaymentMethod[];
  cards: FinanceCard[];
}

export type { InboxStatusFilter, InboxStatusLiteral } from "./inbox.constants";
