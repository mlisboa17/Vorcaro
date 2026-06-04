import type { AdvisorActionType } from "./advisor-action";

export type AdvisorEffort = "LOW" | "MEDIUM" | "HIGH";
export type AdvisorEffortWeight = 1 | 2 | 3;

export type CollectReceivableMetadata = {
  receivableId: string;
  contactChannel?: "whatsapp" | "email";
  value: number;
};

export type ReviewSubscriptionsMetadata = {
  duplicateGroup: string;
  suspectedIds: string[];
  potentialMonthlySaving: number;
  normalizedName: string;
};

export type ReduceExpensesMetadata = {
  category: string;
  currentSpending: number;
  targetSpending: number;
};

export type ReviewSmallExpensesMetadata = {
  category?: string;
  monthlyTotal: number;
  occurrences: number;
  trend: "STABLE" | "UP" | "DOWN";
  trendDeltaPercent?: number;
};

export type ViewGoalMetadata = {
  goalId: string;
  goalName?: string;
};

export type ViewCreditCardMetadata = {
  month?: string;
  creditCardTotal?: number;
  percentOfIncome?: number;
};

export type AdvisorActionMetadataByType = {
  COLLECT_RECEIVABLE: CollectReceivableMetadata;
  REVIEW_SUBSCRIPTIONS: ReviewSubscriptionsMetadata;
  REDUCE_EXPENSES: ReduceExpensesMetadata;
  REVIEW_SMALL_EXPENSES: ReviewSmallExpensesMetadata;
  VIEW_GOAL: ViewGoalMetadata;
  VIEW_CREDIT_CARD: ViewCreditCardMetadata;
};

export type TypedAdvisorActionMetadata =
  | CollectReceivableMetadata
  | ReviewSubscriptionsMetadata
  | ReduceExpensesMetadata
  | ReviewSmallExpensesMetadata
  | ViewGoalMetadata
  | ViewCreditCardMetadata
  | Record<string, unknown>;

export function metadataForType<T extends AdvisorActionType>(
  type: T,
  data: AdvisorActionMetadataByType[T extends keyof AdvisorActionMetadataByType ? T : never],
): TypedAdvisorActionMetadata {
  return data as TypedAdvisorActionMetadata;
}
