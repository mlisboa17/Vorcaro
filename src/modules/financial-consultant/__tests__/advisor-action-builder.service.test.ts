import { describe, expect, it } from "vitest";
import { AdvisorActionBuilderService } from "../application/services/advisor-action-builder.service";
import type { FinancialAlertRecord } from "@/modules/financial-alerts/domain/types/financial-alert";

const baseAlert = (overrides: Partial<FinancialAlertRecord>): FinancialAlertRecord => ({
  id: "a1",
  userId: "u1",
  type: "OVERDUE_RECEIVABLE",
  severity: "WARNING",
  title: "T",
  description: "D",
  status: "OPEN",
  fingerprint: "fp",
  metadata: null,
  actionUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  resolvedAt: null,
  ...overrides,
});

describe("AdvisorActionBuilderService", () => {
  const builder = new AdvisorActionBuilderService();

  it("gera COLLECT_RECEIVABLE com metadata padronizado", () => {
    const actions = builder.build({
      openAlerts: [],
      overdueReceivables: [
        {
          id: "r1",
          descricao: "Cliente X",
          valorPendente: 1500,
          expectedDate: new Date("2026-01-01"),
          status: "OPEN",
        },
      ],
      goalsAtRisk: [],
      subscriptionDuplicates: [],
      moneyLeaks: [],
      spendingHealth: [],
      highCommitment: false,
    });
    const collect = actions.find((a) => a.type === "COLLECT_RECEIVABLE");
    expect(collect).toBeDefined();
    expect(collect!.effort).toBe("MEDIUM");
    expect(collect!.effortWeight).toBe(2);
    expect(collect!.metadata).toMatchObject({
      receivableId: "r1",
      value: 1500,
      contactChannel: "whatsapp",
    });
    expect(collect!.target).toContain("/dashboard/receivables");
  });

  it("gera VIEW_CREDIT_CARD a partir de alerta", () => {
    const actions = builder.build({
      openAlerts: [
        baseAlert({
          id: "c1",
          type: "CREDIT_CARD_RISK",
          severity: "CRITICAL",
          fingerprint: "CREDIT_CARD_RISK:2026-06",
        }),
      ],
      overdueReceivables: [],
      goalsAtRisk: [],
      subscriptionDuplicates: [],
      moneyLeaks: [],
      spendingHealth: [],
      highCommitment: false,
    });
    const card = actions.find((a) => a.type === "VIEW_CREDIT_CARD");
    expect(card?.effort).toBe("LOW");
    expect(card?.effortWeight).toBe(1);
  });

  it("gera REVIEW_SUBSCRIPTIONS com metadata de duplicidade", () => {
    const actions = builder.build({
      openAlerts: [],
      overdueReceivables: [],
      goalsAtRisk: [],
      subscriptionDuplicates: [
        {
          brand: "netflix",
          normalizedName: "Netflix",
          duplicateGroup: "netflix",
          suspectedIds: ["1", "2"],
          potentialMonthlySaving: 45.9,
          occurrences: 2,
          monthlyTotal: 101.8,
          descriptions: ["N1", "N2"],
          cardIds: ["c1", "c2"],
          accountIds: ["a1", "a2"],
        },
      ],
      moneyLeaks: [],
      spendingHealth: [],
      highCommitment: false,
    });
    const sub = actions.find((a) => a.type === "REVIEW_SUBSCRIPTIONS");
    expect(sub?.metadata).toMatchObject({
      duplicateGroup: "netflix",
      suspectedIds: ["1", "2"],
      potentialMonthlySaving: 45.9,
      normalizedName: "Netflix",
    });
    expect(sub?.effort).toBe("LOW");
  });
});
