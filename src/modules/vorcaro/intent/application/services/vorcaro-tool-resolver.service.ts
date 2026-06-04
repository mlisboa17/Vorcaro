import type { VorcaroIntent, VorcaroToolName } from "../../domain/types/vorcaro-intent";

const INTENT_TO_TOOLS: Record<VorcaroIntent, VorcaroToolName[]> = {
  STATUS: ["financial_health", "financial_alerts", "financial_goals", "money_leak_detector", "monthly_commitments"],
  ALERTS: ["financial_alerts"],
  RECEIVABLES: ["receivables"],
  GOALS: ["financial_goals"],
  EXPENSES: ["spending_analysis"],
  CASHFLOW: ["cashflow_projection"],
  COMMITMENTS: ["monthly_commitments"],
  SUBSCRIPTIONS: ["subscription_detector"],
  MONEY_LEAK: ["money_leak_detector", "subscription_detector"],
  HEALTH_SCORE: ["financial_health"],
  NOTIFICATIONS: ["notification_query"],
  RULES_AUTOMATIONS: ["rules_automation"],
  TIMELINE: ["financial_timeline"],
  EVOLUTION: ["financial_evolution"],
  ACHIEVEMENTS: ["financial_achievements"],
  TRENDS: ["financial_trends"],
  GENERAL_CHAT: [],
  UNKNOWN: [],
};

export class VorcaroToolResolverService {
  resolve(primary: VorcaroIntent, related: VorcaroIntent[] = []): VorcaroToolName[] {
    const tools = new Set<VorcaroToolName>();
    for (const tool of INTENT_TO_TOOLS[primary] ?? []) {
      tools.add(tool);
    }
    for (const intent of related) {
      for (const tool of INTENT_TO_TOOLS[intent] ?? []) {
        tools.add(tool);
      }
    }
    return [...tools];
  }
}
