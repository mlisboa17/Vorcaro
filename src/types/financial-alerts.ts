import { z } from "zod";
import {
  FINANCIAL_ALERT_SEVERITIES,
  FINANCIAL_ALERT_STATUSES,
  FINANCIAL_ALERT_TYPES,
} from "@/modules/financial-alerts/domain/types/financial-alert";
import type { FinancialAlertRecord } from "@/modules/financial-alerts/domain/types/financial-alert";

export const financialAlertTypeSchema = z.enum(FINANCIAL_ALERT_TYPES);
export const financialAlertSeveritySchema = z.enum(FINANCIAL_ALERT_SEVERITIES);
export const financialAlertStatusSchema = z.enum(FINANCIAL_ALERT_STATUSES);

export function serializeFinancialAlert(row: FinancialAlertRecord) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    status: row.status,
    fingerprint: row.fingerprint,
    metadata: row.metadata,
    actionUrl: row.actionUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export const patchAlertSchema = z
  .object({
    status: financialAlertStatusSchema,
  })
  .strict();

export const bulkPatchAlertsSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    status: financialAlertStatusSchema,
  })
  .strict();

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  INFO: "Informação",
  WARNING: "Atenção",
  CRITICAL: "Crítico",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  UPCOMING_PAYMENT: "Pagamento próximo",
  OVERDUE_RECEIVABLE: "Recebível atrasado",
  CREDIT_CARD_RISK: "Risco de cartão",
  CASHFLOW_WARNING: "Fluxo de caixa",
  GOAL_AT_RISK: "Meta em risco",
  HIGH_COMMITMENT_MONTH: "Alto comprometimento",
  REIMBURSEMENT_DELAY: "Reembolso atrasado",
};
