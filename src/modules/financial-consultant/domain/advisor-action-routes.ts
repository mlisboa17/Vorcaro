import type { AdvisorActionType } from "./types/advisor-action";

/** Mapeamento de tipos de ação para telas do dashboard (Sprint 9.5). */
export const ADVISOR_ACTION_ROUTES: Record<AdvisorActionType, string> = {
  COLLECT_RECEIVABLE: "/dashboard/receivables",
  VIEW_CREDIT_CARD: "/dashboard/commitments",
  VIEW_GOAL: "/dashboard/planning",
  REDUCE_EXPENSES: "/dashboard/cashflow",
  REVIEW_INSTALLMENTS: "/dashboard/installments",
  REVIEW_SUBSCRIPTIONS: "/dashboard/recurring",
  REVIEW_SMALL_EXPENSES: "/dashboard/transactions",
  REDUCE_SUPERFLUOUS_EXPENSES: "/dashboard/transactions",
  VIEW_ALERTS: "/dashboard/notifications?type=alert",
  VIEW_COMMITMENTS: "/dashboard/commitments",
};

export function resolveActionTarget(type: AdvisorActionType, metadata?: Record<string, unknown>): string {
  const base = ADVISOR_ACTION_ROUTES[type];
  if (type === "VIEW_GOAL" && metadata?.goalId) {
    return `${base}?goal=${metadata.goalId}`;
  }
  if (type === "COLLECT_RECEIVABLE" && metadata?.receivableId) {
    return `${base}?highlight=${metadata.receivableId}`;
  }
  return base;
}
