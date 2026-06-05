export const VORCARO_INTENTS = [
  "STATUS",
  "ALERTS",
  "RECEIVABLES",
  "GOALS",
  "EXPENSES",
  "CASHFLOW",
  "COMMITMENTS",
  "SUBSCRIPTIONS",
  "MONEY_LEAK",
  "HEALTH_SCORE",
  "NOTIFICATIONS",
  "RULES_AUTOMATIONS",
  "CATEGORY_AUDIT",
  "CATEGORY_LIST",
  "CARD_LIST",
  "TIMELINE",
  "EVOLUTION",
  "ACHIEVEMENTS",
  "TRENDS",
  "FOLLOWUPS",
  "STRATEGIC_ADVICE",
  "GENERAL_CHAT",
  "UNKNOWN",
] as const;

export type VorcaroIntent = (typeof VORCARO_INTENTS)[number];

export type VorcaroIntentDetection = {
  primary: VorcaroIntent;
  related: VorcaroIntent[];
  requiresLlm: boolean;
  confidence: number;
};

export type VorcaroToolName =
  | "financial_health"
  | "financial_alerts"
  | "receivables"
  | "financial_goals"
  | "cashflow_projection"
  | "monthly_commitments"
  | "subscription_detector"
  | "money_leak_detector"
  | "notification_query"
  | "spending_analysis"
  | "rules_automation"
  | "category_audit"
  | "category_list"
  | "card_list"
  | "financial_timeline"
  | "financial_evolution"
  | "financial_achievements"
  | "financial_trends"
  | "follow_ups";

import type { VorcaroToolAction } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";

export type VorcaroToolResult = {
  intent: VorcaroIntent;
  title: string;
  summary: string;
  facts: string[];
  metrics: Record<string, unknown>;
  recommendations: string[];
  suggestedActions?: VorcaroToolAction[];
};

export type VorcaroIntentObservabilitySnapshot = {
  intent_detected: number;
  tool_called: number;
  tool_only_response: number;
  llm_called: number;
  fallback_to_llm: number;
  responses_approved: number;
  responses_rejected: number;
  wrong_tool_detected: number;
  context_switch_blocked: number;
  humanization_applied: number;
  responses_regenerated: number;
};

export const VORCARO_INTENT_CACHE_TTL_MS = 60_000;
