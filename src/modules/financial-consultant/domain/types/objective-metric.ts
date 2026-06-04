export const OBJECTIVE_COMPARISON_TYPES = [
  "INCOME_PERCENTAGE",
  "MONTHLY_AVERAGE",
  "PREVIOUS_MONTH",
  "THREE_MONTH_TREND",
  "DUPLICATE_COUNT",
  "THRESHOLD",
] as const;

export type ObjectiveComparisonType = (typeof OBJECTIVE_COMPARISON_TYPES)[number];

export type ObjectiveMetric = {
  currentValue: number;
  comparisonValue?: number;
  comparisonType: ObjectiveComparisonType;
  percentage?: number;
  threshold?: number;
  trendDeltaPercent?: number;
  explanation: string;
};
