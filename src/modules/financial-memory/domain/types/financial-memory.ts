import type {
  FinancialTimelineEventType,
  FinancialTimelineImpactLevel,
  FinancialTrendDirection,
} from "@prisma/client";

export type { FinancialTimelineEventType, FinancialTimelineImpactLevel, FinancialTrendDirection };

export const COMPARISON_PERIODS_DAYS = [30, 90, 180, 365] as const;
export type ComparisonPeriodDays = (typeof COMPARISON_PERIODS_DAYS)[number];

export const MIN_HISTORY_DAYS_FOR_ANALYSIS = 30;

export const VORCARO_INSUFFICIENT_HISTORY_MESSAGE =
  "Não há histórico suficiente para uma análise confiável.";

export type FinancialTimelineEventRecord = {
  id: string;
  userId: string;
  eventType: FinancialTimelineEventType;
  title: string;
  description: string;
  eventDate: Date;
  impactLevel: FinancialTimelineImpactLevel;
  metadata: Record<string, unknown> | null;
  fingerprint: string;
  createdAt: Date;
};

/** Calculado sob demanda — não persistido em banco (Sprint 12 aditivo). */
export type FinancialEvolutionProfileRecord = {
  healthTrend: FinancialTrendDirection;
  cashflowTrend: FinancialTrendDirection;
  spendingTrend: FinancialTrendDirection;
  debtTrend: FinancialTrendDirection;
  goalTrend: FinancialTrendDirection;
  netWorthTrend: FinancialTrendDirection;
  historyDaysAvailable: number;
  lastHealthScore: number | null;
  previousHealthScore: number | null;
};

export type FinancialMetricSnapshotRecord = {
  id: string;
  userId: string;
  snapshotDate: Date;
  healthScore: number;
  netWorth: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashflow: number;
};

export type PeriodComparisonResult = {
  periodDays: ComparisonPeriodDays;
  hasSufficientHistory: boolean;
  current: FinancialMetricSnapshotRecord | null;
  past: FinancialMetricSnapshotRecord | null;
  deltas: {
    healthScore: number | null;
    netWorth: number | null;
    netWorthPercent: number | null;
    totalDebt: number | null;
    monthlyCashflow: number | null;
    monthlyExpenses: number | null;
  };
};

export type EvolutionHealthScoreResult = {
  current: number;
  previous: number | null;
  delta: number | null;
  label: string;
  hasSufficientHistory: boolean;
};

export type FinancialAchievementRecord = {
  id: string;
  achievementKey: string;
  title: string;
  description: string;
  unlockedAt: Date;
  metadata: Record<string, unknown> | null;
};

export type TimelineEngineRunStats = {
  userId: string;
  snapshotsRecorded: number;
  eventsCreated: number;
  achievementsUnlocked: number;
  durationMs: number;
};

export type FinancialMemoryObservabilitySnapshot = {
  timeline_events_created: number;
  evolution_queries: number;
  achievement_unlocked: number;
  trend_detected: number;
};
