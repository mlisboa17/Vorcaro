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
  | "rules_automation";

export type VorcaroToolResult = {
  intent: VorcaroIntent;
  title: string;
  summary: string;
  facts: string[];
  metrics: Record<string, unknown>;
  recommendations: string[];
};

export type VorcaroIntentObservabilitySnapshot = {
  intent_detected: number;
  tool_called: number;
  tool_only_response: number;
  llm_called: number;
  fallback_to_llm: number;
};

export const VORCARO_INTENT_CACHE_TTL_MS = 60_000;
