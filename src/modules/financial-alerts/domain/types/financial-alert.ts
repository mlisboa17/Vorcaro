export const FINANCIAL_ALERT_TYPES = [
  "UPCOMING_PAYMENT",
  "OVERDUE_RECEIVABLE",
  "CREDIT_CARD_RISK",
  "CASHFLOW_WARNING",
  "GOAL_AT_RISK",
  "HIGH_COMMITMENT_MONTH",
  "REIMBURSEMENT_DELAY",
] as const;

export type FinancialAlertType = (typeof FINANCIAL_ALERT_TYPES)[number];

export const FINANCIAL_ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type FinancialAlertSeverity = (typeof FINANCIAL_ALERT_SEVERITIES)[number];

export const FINANCIAL_ALERT_STATUSES = ["OPEN", "DISMISSED", "RESOLVED"] as const;
export type FinancialAlertStatus = (typeof FINANCIAL_ALERT_STATUSES)[number];

export type FinancialAlertRecord = {
  id: string;
  userId: string;
  type: FinancialAlertType;
  severity: FinancialAlertSeverity;
  title: string;
  description: string;
  status: FinancialAlertStatus;
  fingerprint: string;
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
};

export type AlertRuleCandidate = {
  fingerprint: string;
  type: FinancialAlertType;
  severity: FinancialAlertSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string | null;
  active: boolean;
};

export type FinancialAlertListFilters = {
  status?: FinancialAlertStatus;
  severity?: FinancialAlertSeverity;
  type?: FinancialAlertType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

export type PaginatedAlerts<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type FinancialAlertSummary = {
  totalOpen: number;
  totalResolved: number;
  totalCritical: number;
  bySeverity: Record<FinancialAlertSeverity, number>;
  byType: Record<string, number>;
};
