export const VORCARO_MOODS = ["NORMAL", "FOCUSED", "CONCERNED", "CELEBRATING"] as const;

export type VorcaroMood = (typeof VORCARO_MOODS)[number];

export const VORCARO_MOOD_LABELS: Record<VorcaroMood, string> = {
  NORMAL: "Normal",
  FOCUSED: "Focado",
  CONCERNED: "Preocupado",
  CELEBRATING: "Celebrando",
};

export type VorcaroMoodContext = {
  negativeCashflowDays?: number | null;
  overdueReceivableAmount?: number;
  goalsAtRisk?: number;
  highCommitmentPercent?: number;
  savingsOpportunityMonthly?: number;
  criticalAlertCount?: number;
  debtRecentlyPaid?: boolean;
  positiveGoalProgress?: boolean;
};

export type ResolvedVorcaroMood = {
  mood: VorcaroMood;
  hint?: string;
};
