import type { AdvisorEffort, AdvisorEffortWeight, TypedAdvisorActionMetadata } from "./advisor-action-metadata";
import type { ObjectiveMetric } from "./objective-metric";

export const ADVISOR_ACTION_TYPES = [
  "COLLECT_RECEIVABLE",
  "VIEW_CREDIT_CARD",
  "VIEW_GOAL",
  "REDUCE_EXPENSES",
  "REVIEW_INSTALLMENTS",
  "REVIEW_SUBSCRIPTIONS",
  "REVIEW_SMALL_EXPENSES",
  "REDUCE_SUPERFLUOUS_EXPENSES",
  "VIEW_ALERTS",
  "VIEW_COMMITMENTS",
] as const;

export type AdvisorActionType = (typeof ADVISOR_ACTION_TYPES)[number];

export type AdvisorActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AdvisorAction = {
  id: string;
  type: AdvisorActionType;
  title: string;
  description: string;
  priority: AdvisorActionPriority;
  effort: AdvisorEffort;
  effortWeight: AdvisorEffortWeight;
  recommendationHash: string;
  actionUrl: string;
  target?: string;
  estimatedImpact: number;
  objectiveMetric: ObjectiveMetric;
  metadata: TypedAdvisorActionMetadata;
};

export type AdvisorRisk = {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  description: string;
  source: string;
};

export type FinancialHealthClassification =
  | "EXCELENTE"
  | "SAUDAVEL"
  | "ATENCAO"
  | "CRITICA";

export type FinancialHealthScore = {
  score: number;
  classification: FinancialHealthClassification;
  factors: Array<{ label: string; impact: number }>;
};

export type SavingsOpportunity = {
  rank: number;
  title: string;
  description: string;
  estimatedMonthlySavings: number;
  effort: AdvisorEffort;
  effortWeight: AdvisorEffortWeight;
  priorityScore: number;
  actionType?: AdvisorActionType;
  actionId?: string;
};

export type SpendingHealthCategory = {
  key: string;
  label: string;
  monthlyAmount: number;
  percentOfIncome: number;
  trend: "UP" | "DOWN" | "STABLE";
};

export type SubscriptionDuplicateFinding = {
  brand: string;
  normalizedName: string;
  duplicateGroup: string;
  suspectedIds: string[];
  potentialMonthlySaving: number;
  occurrences: number;
  monthlyTotal: number;
  descriptions: string[];
  cardIds: string[];
  accountIds: string[];
};

export type MoneyLeakFinding = {
  label: string;
  monthlyTotal: number;
  itemCount: number;
  occurrences: number;
  trend: "STABLE" | "UP" | "DOWN";
  trendDeltaPercent?: number;
  suggestedPriority: AdvisorActionPriority;
  itemIds: string[];
  monthlyHistory: number[];
};

export type AdvisorConsultation = {
  summary: string;
  risks: AdvisorRisk[];
  recommendations: string[];
  actions: AdvisorAction[];
  healthScore: FinancialHealthScore;
  savingsOpportunities: SavingsOpportunity[];
  subscriptionDuplicates: SubscriptionDuplicateFinding[];
  moneyLeaks: MoneyLeakFinding[];
  spendingHealth: SpendingHealthCategory[];
  generatedAt: string;
};
