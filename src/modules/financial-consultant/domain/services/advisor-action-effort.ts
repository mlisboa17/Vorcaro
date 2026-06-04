import type { AdvisorActionPriority, AdvisorActionType } from "../types/advisor-action";
import type { AdvisorEffort, AdvisorEffortWeight } from "../types/advisor-action-metadata";

export const ACTION_EFFORT_CONFIG: Record<
  AdvisorActionType,
  { effort: AdvisorEffort; effortWeight: AdvisorEffortWeight }
> = {
  REVIEW_SUBSCRIPTIONS: { effort: "LOW", effortWeight: 1 },
  VIEW_ALERTS: { effort: "LOW", effortWeight: 1 },
  VIEW_COMMITMENTS: { effort: "LOW", effortWeight: 1 },
  VIEW_CREDIT_CARD: { effort: "LOW", effortWeight: 1 },
  COLLECT_RECEIVABLE: { effort: "MEDIUM", effortWeight: 2 },
  REVIEW_INSTALLMENTS: { effort: "MEDIUM", effortWeight: 2 },
  VIEW_GOAL: { effort: "MEDIUM", effortWeight: 2 },
  REVIEW_SMALL_EXPENSES: { effort: "LOW", effortWeight: 1 },
  REDUCE_EXPENSES: { effort: "HIGH", effortWeight: 3 },
  REDUCE_SUPERFLUOUS_EXPENSES: { effort: "HIGH", effortWeight: 3 },
};

const PRIORITY_ORDER: AdvisorActionPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function getActionEffort(type: AdvisorActionType): {
  effort: AdvisorEffort;
  effortWeight: AdvisorEffortWeight;
} {
  return ACTION_EFFORT_CONFIG[type];
}

export function elevatePriorityOneLevel(
  priority: AdvisorActionPriority,
): AdvisorActionPriority {
  const idx = PRIORITY_ORDER.indexOf(priority);
  return PRIORITY_ORDER[Math.min(idx + 1, PRIORITY_ORDER.length - 1)];
}

export function computePriorityScore(
  estimatedImpact: number,
  effortWeight: AdvisorEffortWeight,
): number {
  if (effortWeight <= 0) return 0;
  return Math.round((estimatedImpact / effortWeight) * 100) / 100;
}
