import type { InboxItem } from "@/types/inbox";
import { REVIEWABLE_STATUSES } from "@/types/inbox.constants";
import type { InboxChannel } from "@prisma/client";
import { parseInboxImportMetadata } from "@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema";
import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";
import { READY_TO_CONFIRM_THRESHOLD } from "@/modules/inbox-intelligence/domain/types/inbox-classification";

export type InboxReviewFilters = {
  search: string;
  channel: InboxChannel | "";
  cardId: string;
  categoryId: string;
  /** Alta confiança (≥95%) com categoria sugerida. */
  highConfidenceOnly: boolean;
  /** Sem categoria sugerida. */
  noCategoryOnly: boolean;
  /** Confiança baixa (<70%). */
  lowConfidenceOnly: boolean;
  /** Possível duplicata sinalizada. */
  possibleDuplicateOnly: boolean;
  /** Possível reembolso sinalizado. */
  potentialReimbursementOnly: boolean;
};

export const EMPTY_INBOX_REVIEW_FILTERS: InboxReviewFilters = {
  search: "",
  channel: "",
  cardId: "",
  categoryId: "",
  highConfidenceOnly: false,
  noCategoryOnly: false,
  lowConfidenceOnly: false,
  possibleDuplicateOnly: false,
  potentialReimbursementOnly: false,
};

export function isReviewFiltersActive(filters: InboxReviewFilters): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.channel ||
      filters.cardId ||
      filters.categoryId ||
      filters.highConfidenceOnly ||
      filters.noCategoryOnly ||
      filters.lowConfidenceOnly ||
      filters.possibleDuplicateOnly ||
      filters.potentialReimbursementOnly,
  );
}

export function filterInboxItemsForReview(
  items: readonly InboxItem[],
  filters: InboxReviewFilters,
  categoryNameById?: ReadonlyMap<string, string>,
  classifications?: Readonly<Record<string, InboxClassificationSuggestion>>,
): InboxItem[] {
  const term = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    const suggestion = classifications?.[item.id];

    if (term) {
      const haystack = item.rawContent.toLowerCase();
      if (!haystack.includes(term)) {
        return false;
      }
    }

    if (filters.channel && item.channel !== filters.channel) {
      return false;
    }

    const metadata = parseInboxImportMetadata(item.metadata);
    if (filters.cardId && metadata?.cartaoId !== filters.cardId) {
      return false;
    }

    if (filters.categoryId && categoryNameById) {
      const categoryName = categoryNameById.get(filters.categoryId)?.toLowerCase();
      if (categoryName && !item.rawContent.toLowerCase().includes(categoryName)) {
        return false;
      }
    }

    if (filters.highConfidenceOnly) {
      if (
        !suggestion?.categoryId ||
        suggestion.confidence < READY_TO_CONFIRM_THRESHOLD
      ) {
        return false;
      }
    }

    if (filters.noCategoryOnly && suggestion?.categoryId) {
      return false;
    }

    if (filters.lowConfidenceOnly) {
      if (!suggestion || suggestion.confidence >= 70) {
        return false;
      }
    }

    if (filters.possibleDuplicateOnly && !suggestion?.possibleDuplicate) {
      return false;
    }

    if (filters.potentialReimbursementOnly && !suggestion?.isPotentialReimbursement) {
      return false;
    }

    return true;
  });
}

export function getSelectableInboxItems(items: readonly InboxItem[]): InboxItem[] {
  return items.filter((item) => REVIEWABLE_STATUSES.includes(item.status));
}

export function getInboxGroupKey(item: InboxItem): string {
  const firstLine = item.rawContent.split(/\r?\n/)[0]?.trim() ?? "";
  const normalized = firstLine
    .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, "")
    .replace(/[Cc]?\d{1,2}\/\d{1,2}/g, "")
    .replace(/\bR\$\s*[\d.,]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Outros";
  }

  return normalized.length > 48 ? `${normalized.slice(0, 48)}…` : normalized;
}

export type InboxItemGroup = {
  key: string;
  items: InboxItem[];
};

export function groupInboxItems(items: readonly InboxItem[]): InboxItemGroup[] {
  const map = new Map<string, InboxItem[]>();

  for (const item of items) {
    const key = getInboxGroupKey(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([key, groupItems]) => ({ key, items: groupItems }));
}
