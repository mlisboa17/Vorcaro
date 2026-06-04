import type { VorcaroMoodContext } from "./vorcaro-mood";

export const VORCARO_TONES = [
  "PROFESSIONAL",
  "DIRECT",
  "BALANCED",
  "VORCARO",
  "IMPACT",
  "REALITY_AUDITOR",
] as const;

export type VorcaroTone = (typeof VORCARO_TONES)[number];

export const VORCARO_ARCHETYPES = ["ANALYST", "CFO", "INVESTOR", "AUDITOR", "PARTNER"] as const;
export type VorcaroArchetype = (typeof VORCARO_ARCHETYPES)[number];

export const VORCARO_TEMPLATE_CATEGORIES = [
  "DELIVERY",
  "DUPLICATE_STREAMING",
  "OVERDUE_RECEIVABLE",
  "GOAL_AT_RISK",
  "NEGATIVE_CASHFLOW",
  "MONEY_LEAK",
  "HIGH_COMMITMENT",
  "EXCESSIVE_INSTALLMENTS",
  "CREDIT_CARD",
  "FORGOTTEN_SUBSCRIPTION",
  "INVISIBLE_SPENDING",
  "IMPULSE_PURCHASE",
  "PATRIMONY",
  "INVESTMENTS",
  "GENERAL",
] as const;

export type VorcaroTemplateCategory = (typeof VORCARO_TEMPLATE_CATEGORIES)[number];

export type VorcaroCriticalInput = VorcaroMoodContext & {
  delinquency?: boolean;
  severeNegativeFlow?: boolean;
  highCommitmentPercent?: number;
};

export type VorcaroStructuredMessage = {
  fact: string;
  impact: string;
  action: string;
  observation?: string;
  formatted: string;
  templateId: string;
  category: VorcaroTemplateCategory;
  tone: VorcaroTone;
  archetype: VorcaroArchetype;
};

export type VorcaroMessageInput = {
  userId: string;
  category: VorcaroTemplateCategory;
  fact: string;
  impact: string;
  action: string;
  tone?: VorcaroTone;
  criticalContext?: VorcaroCriticalInput;
};

export const VORCARO_TONE_LABELS: Record<VorcaroTone, string> = {
  PROFESSIONAL: "Vorcaro Professional",
  DIRECT: "Vorcaro Direct",
  BALANCED: "Vorcaro Balanced",
  VORCARO: "Vorcaro",
  IMPACT: "Vorcaro Impact",
  REALITY_AUDITOR: "Vorcaro Auditor da Realidade",
};
