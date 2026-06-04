import type { AdvisorConsultation } from "@/modules/financial-consultant/domain/types/advisor-action";
import type { VorcaroCriticalInput } from "./types/vorcaro-personality";

function parseCashflowDaysFromRisk(consultation: AdvisorConsultation): number | null | undefined {
  const risk = consultation.risks.find((r) => r.id === "risk-cashflow");
  if (!risk) return undefined;

  const dateMatch = risk.description.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return 0;

  return Math.max(
    0,
    Math.ceil(
      (new Date(`${dateMatch[1]}T12:00:00.000Z`).getTime() - Date.now()) / 86400000,
    ),
  );
}

function parseOverdueAmount(consultation: AdvisorConsultation): number {
  const risk = consultation.risks.find((r) => r.id === "risk-receivables");
  if (!risk) return 0;
  const amountMatch = risk.description.match(/R\$\s*([\d.,]+)/);
  if (!amountMatch) return 0;
  return Number(amountMatch[1].replace(/\./g, "").replace(",", ".")) || 0;
}

export function deriveVorcaroCriticalFromConsultation(
  consultation: AdvisorConsultation,
): VorcaroCriticalInput {
  const savingsOpportunityMonthly = consultation.savingsOpportunities.reduce(
    (s, o) => s + o.estimatedMonthlySavings,
    0,
  );

  const goalsAtRisk = consultation.risks.filter((r) =>
    r.title.toLowerCase().includes("meta"),
  ).length;

  return {
    negativeCashflowDays: parseCashflowDaysFromRisk(consultation),
    overdueReceivableAmount: parseOverdueAmount(consultation),
    goalsAtRisk: goalsAtRisk || undefined,
    savingsOpportunityMonthly,
    criticalAlertCount: consultation.risks.filter((r) => r.severity === "critical").length,
    severeNegativeFlow: consultation.risks.some((r) => r.id === "risk-cashflow"),
  };
}
