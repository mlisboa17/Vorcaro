import type { VorcaroActionType } from "../types/vorcaro-action";

export const VORCARO_NAVIGATION_ROUTES: Record<VorcaroActionType, string> = {
  OPEN_RECEIVABLE: "/dashboard/receivables",
  OPEN_ALERT: "/dashboard/notifications",
  OPEN_GOAL: "/dashboard/planning",
  OPEN_COMMITMENT: "/dashboard/commitments",
  OPEN_SUBSCRIPTION: "/dashboard/settings?tab=recorrentes",
  OPEN_MONEY_LEAK: "/dashboard/transactions",
  OPEN_TIMELINE: "/dashboard/vorcaro/timeline",
  OPEN_NOTIFICATION: "/dashboard/notifications",
  OPEN_DASHBOARD_SECTION: "/dashboard",
  CREATE_RULE_SUGGESTION: "/dashboard/automation/rules",
  CREATE_GOAL_SUGGESTION: "/dashboard/planning",
};
