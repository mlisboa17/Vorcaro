import type { TransactionType } from "@prisma/client";
import type { TransactionAllocation } from "@/lib/financial/liability-payment-metadata";
import type { FinanceCatalog } from "@/types/inbox";

export interface TransactionRelation {
  id: string;
  name: string;
}

export interface TransactionListItem {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  dataCaixa: string | null;
  dataCompra: string | null;
  inboxItemId: string | null;
  accountId: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  cardId: string | null;
  liabilityId: string | null;
  allocations?: TransactionAllocation[];
  account: TransactionRelation | null;
  category: TransactionRelation | null;
  paymentMethod: TransactionRelation | null;
  card: TransactionRelation | null;
  installments: number;
  currentInstallment: number | null;
  totalInstallments: number | null;
  createdAt: string;
}

export interface TransactionSummary {
  mainAccountId: string | null;
  mainAccountName: string | null;
  mainAccountBalance: number;
  periodIncome: number;
  periodExpense: number;
  periodLabel: string;
}

export interface TransactionListResponse {
  items: TransactionListItem[];
  total: number;
  summary: TransactionSummary;
}

export type PeriodPreset = "current_month" | "previous_month";

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  period?: PeriodPreset;
  limit?: number;
  offset?: number;
}

export type { FinanceCatalog };
