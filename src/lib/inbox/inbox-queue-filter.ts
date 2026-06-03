import type { InboxItem } from "@/types/inbox";
import type { InboxStatusLiteral } from "@/types/inbox.constants";
import { REVIEWABLE_STATUSES } from "@/types/inbox.constants";

export type InboxQueueFilter = "PENDENTES" | "EFETIVADOS" | "IGNORADOS" | "TODOS";

export const INBOX_QUEUE_TABS: { value: InboxQueueFilter; label: string }[] = [
  { value: "PENDENTES", label: "Pendentes" },
  { value: "EFETIVADOS", label: "Efetivados" },
  { value: "IGNORADOS", label: "Ignorados" },
  { value: "TODOS", label: "Todos" },
];

export const DEFAULT_INBOX_QUEUE: InboxQueueFilter = "PENDENTES";

export const PENDING_QUEUE_STATUSES: InboxStatusLiteral[] = [
  "PENDING",
  "PROCESSING",
  "READY",
  "NEEDS_CONFIRMATION",
];

export function parseInboxQueueFilter(value: string | null): InboxQueueFilter {
  if (value && INBOX_QUEUE_TABS.some((tab) => tab.value === value)) {
    return value as InboxQueueFilter;
  }
  return DEFAULT_INBOX_QUEUE;
}

export function matchesInboxQueue(item: InboxItem, queue: InboxQueueFilter): boolean {
  switch (queue) {
    case "PENDENTES":
      return PENDING_QUEUE_STATUSES.includes(item.status);
    case "EFETIVADOS":
      return item.status === "SAVED";
    case "IGNORADOS":
      return item.status === "ERROR";
    case "TODOS":
      return true;
    default:
      return true;
  }
}

export function countPendingInboxItems(items: readonly InboxItem[]): number {
  return items.filter((item) => PENDING_QUEUE_STATUSES.includes(item.status)).length;
}

export function countReviewableInboxItems(items: readonly InboxItem[]): number {
  return items.filter((item) => REVIEWABLE_STATUSES.includes(item.status)).length;
}

/** Duração da fase “Efetivado” visível antes do fade-out (ms). */
export const EFETIVACAO_HOLD_MS = 380;

/** Duração do fade-out (ms). */
export const EFETIVACAO_FADE_MS = 420;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runEfetivacaoExitSequence(
  ids: readonly string[],
  handlers: {
    onShowEfetivado: (ids: readonly string[]) => void;
    onStartFadeOut: (ids: readonly string[]) => void;
    onComplete: (ids: readonly string[]) => void;
  },
): Promise<void> {
  if (ids.length === 0) return;

  handlers.onShowEfetivado(ids);
  await sleep(EFETIVACAO_HOLD_MS);
  handlers.onStartFadeOut(ids);
  await sleep(EFETIVACAO_FADE_MS);
  handlers.onComplete(ids);
}

export type InboxBulkConfirmSummary = {
  confirmed: number;
  needsReview: number;
  failed: number;
  failedItems: Array<{ id: string; reason: string }>;
};

export function buildBulkConfirmSummary(payload: {
  confirmed?: number;
  skipped?: number;
  failed?: number;
  failedItems?: Array<{ id: string; reason: string }>;
}): InboxBulkConfirmSummary {
  return {
    confirmed: payload.confirmed ?? 0,
    needsReview: payload.skipped ?? 0,
    failed: payload.failed ?? 0,
    failedItems: payload.failedItems ?? [],
  };
}
