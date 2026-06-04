import { resolveActionTarget } from "../../domain/advisor-action-routes";
import {
  elevatePriorityOneLevel,
  getActionEffort,
} from "../../domain/services/advisor-action-effort";
import type {
  AdvisorAction,
  AdvisorActionPriority,
  MoneyLeakFinding,
  SpendingHealthCategory,
  SubscriptionDuplicateFinding,
} from "../../domain/types/advisor-action";
import type {
  CollectReceivableMetadata,
  ReduceExpensesMetadata,
  ReviewSmallExpensesMetadata,
  ReviewSubscriptionsMetadata,
  ViewCreditCardMetadata,
  ViewGoalMetadata,
} from "../../domain/types/advisor-action-metadata";
import type { FinancialAlertRecord } from "@/modules/financial-alerts/domain/types/financial-alert";

export type ReceivableForAction = {
  id: string;
  descricao: string;
  valorPendente: number;
  expectedDate: Date | null;
  status: string;
};

export type GoalForAction = {
  id: string;
  nome: string;
  atRisk: boolean;
};

export class AdvisorActionBuilderService {
  build(input: {
    openAlerts: FinancialAlertRecord[];
    overdueReceivables: ReceivableForAction[];
    goalsAtRisk: GoalForAction[];
    subscriptionDuplicates: SubscriptionDuplicateFinding[];
    moneyLeaks: MoneyLeakFinding[];
    spendingHealth: SpendingHealthCategory[];
    highCommitment: boolean;
  }): AdvisorAction[] {
    const actions: AdvisorAction[] = [];
    const seen = new Set<string>();

    type ActionDraft = Omit<
      AdvisorAction,
      | "effort"
      | "effortWeight"
      | "target"
      | "recommendationHash"
      | "actionUrl"
      | "objectiveMetric"
      | "estimatedImpact"
    > & { estimatedImpact?: number };

    const push = (draft: ActionDraft) => {
      const key = `${draft.type}:${draft.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const { effort, effortWeight } = getActionEffort(draft.type);
      actions.push({
        ...draft,
        estimatedImpact: draft.estimatedImpact ?? 0,
        effort,
        effortWeight,
        recommendationHash: "",
        actionUrl: "",
        objectiveMetric: {
          currentValue: draft.estimatedImpact ?? 0,
          comparisonType: "THRESHOLD",
          explanation: draft.description,
        },
        target: resolveActionTarget(draft.type, draft.metadata as Record<string, unknown>),
      } as AdvisorAction);
    };

    for (const r of input.overdueReceivables) {
      const metadata: CollectReceivableMetadata = {
        receivableId: r.id,
        value: r.valorPendente,
        contactChannel: "whatsapp",
      };
      push({
        id: `collect-${r.id}`,
        type: "COLLECT_RECEIVABLE",
        title: "Cobrar recebível pendente",
        description: `${r.descricao} — pendente R$ ${r.valorPendente.toFixed(2)}.`,
        priority: "HIGH",
        estimatedImpact: r.valorPendente,
        metadata,
      });
    }

    for (const alert of input.openAlerts) {
      switch (alert.type) {
        case "CREDIT_CARD_RISK": {
          const meta = alert.metadata as Record<string, unknown> | null;
          const metadata: ViewCreditCardMetadata = {
            month: typeof meta?.month === "string" ? meta.month : undefined,
            creditCardTotal:
              typeof meta?.creditCardTotal === "number" ? meta.creditCardTotal : undefined,
            percentOfIncome:
              typeof meta?.percentual === "number"
                ? Math.round((meta.percentual as number) * 1000) / 10
                : undefined,
          };
          push({
            id: `alert-${alert.id}`,
            type: "VIEW_CREDIT_CARD",
            title: "Revisar fatura do cartão",
            description: alert.description,
            priority: "CRITICAL",
            metadata,
          });
          break;
        }
        case "GOAL_AT_RISK": {
          const goalId =
            typeof alert.metadata?.goalId === "string" ? alert.metadata.goalId : "unknown";
          const metadata: ViewGoalMetadata = {
            goalId,
            goalName: typeof alert.metadata?.nome === "string" ? alert.metadata.nome : undefined,
          };
          push({
            id: `alert-${alert.id}`,
            type: "VIEW_GOAL",
            title: "Revisar plano da meta",
            description: alert.description,
            priority: "HIGH",
            metadata,
          });
          break;
        }
        case "CASHFLOW_WARNING": {
          const metadata: ReduceExpensesMetadata = {
            category: "GERAL",
            currentSpending: 0,
            targetSpending: 0,
          };
          push({
            id: `alert-${alert.id}`,
            type: "REDUCE_EXPENSES",
            title: "Reduzir despesas imediatamente",
            description: alert.description,
            priority: "CRITICAL",
            metadata,
          });
          break;
        }
        case "HIGH_COMMITMENT_MONTH":
          push({
            id: `alert-${alert.id}`,
            type: "REVIEW_INSTALLMENTS",
            title: "Revisar parcelamentos e compromissos",
            description: alert.description,
            priority: "CRITICAL",
            metadata: {},
          });
          break;
        case "OVERDUE_RECEIVABLE":
          if (!input.overdueReceivables.some((x) => alert.fingerprint.includes(x.id))) {
            const receivableId =
              typeof alert.metadata?.receivableId === "string"
                ? alert.metadata.receivableId
                : "unknown";
            push({
              id: `alert-${alert.id}`,
              type: "COLLECT_RECEIVABLE",
              title: "Cobrar recebível pendente",
              description: alert.description,
              priority: "HIGH",
              metadata: {
                receivableId,
                value:
                  typeof alert.metadata?.valorPendente === "number"
                    ? alert.metadata.valorPendente
                    : 0,
              } satisfies CollectReceivableMetadata,
            });
          }
          break;
        case "REIMBURSEMENT_DELAY": {
          const receivableId =
            typeof alert.metadata?.receivableId === "string"
              ? alert.metadata.receivableId
              : "unknown";
          push({
            id: `alert-${alert.id}`,
            type: "COLLECT_RECEIVABLE",
            title: "Cobrar reembolso atrasado",
            description: alert.description,
            priority: "HIGH",
            metadata: {
              receivableId,
              value:
                typeof alert.metadata?.valorPendente === "number"
                  ? alert.metadata.valorPendente
                  : 0,
            } satisfies CollectReceivableMetadata,
          });
          break;
        }
        case "UPCOMING_PAYMENT":
          push({
            id: `alert-${alert.id}`,
            type: "VIEW_COMMITMENTS",
            title: "Conferir pagamento próximo",
            description: alert.description,
            priority: "MEDIUM",
            metadata: alert.metadata ?? {},
          });
          break;
        default:
          if (alert.severity === "CRITICAL") {
            push({
              id: `alert-${alert.id}`,
              type: "VIEW_ALERTS",
              title: alert.title,
              description: alert.description,
              priority: "CRITICAL",
              metadata: { alertId: alert.id },
            });
          }
      }
    }

    for (const g of input.goalsAtRisk) {
      const metadata: ViewGoalMetadata = { goalId: g.id, goalName: g.nome };
      push({
        id: `goal-${g.id}`,
        type: "VIEW_GOAL",
        title: "Revisar plano da meta",
        description: `A meta "${g.nome}" pode não ser atingida no prazo atual.`,
        priority: "HIGH",
        metadata,
      });
    }

    if (input.highCommitment && !actions.some((a) => a.type === "REVIEW_INSTALLMENTS")) {
      push({
        id: "high-commitment",
        type: "REVIEW_INSTALLMENTS",
        title: "Revisar parcelamentos e compromissos",
        description: "Compromissos do mês ultrapassam 80% da renda prevista.",
        priority: "CRITICAL",
        metadata: {},
      });
    }

    for (const dup of input.subscriptionDuplicates) {
      const metadata: ReviewSubscriptionsMetadata = {
        duplicateGroup: dup.duplicateGroup,
        suspectedIds: dup.suspectedIds,
        potentialMonthlySaving: dup.potentialMonthlySaving,
        normalizedName: dup.normalizedName,
      };
      push({
        id: `dup-${dup.duplicateGroup}`,
        type: "REVIEW_SUBSCRIPTIONS",
        title: `Revisar assinatura duplicada (${dup.normalizedName})`,
        description: `Foi detectada uma possível assinatura duplicada da ${dup.normalizedName}.`,
        priority: "HIGH",
        estimatedImpact: dup.potentialMonthlySaving,
        metadata,
      });
    }

    for (const leak of input.moneyLeaks) {
      let priority: AdvisorActionPriority = leak.suggestedPriority;
      if (leak.trend === "UP" && leak.monthlyHistory.length >= 3) {
        const base: AdvisorActionPriority = "LOW";
        priority = elevatePriorityOneLevel(base);
      }

      const metadata: ReviewSmallExpensesMetadata = {
        category: "PEQUENOS_GASTOS",
        monthlyTotal: leak.monthlyTotal,
        occurrences: leak.occurrences,
        trend: leak.trend,
        trendDeltaPercent: leak.trendDeltaPercent,
      };

      push({
        id: "money-leak",
        type: "REVIEW_SMALL_EXPENSES",
        title: "Revisar gastos invisíveis",
        description: `Você possui R$ ${leak.monthlyTotal.toFixed(2)}/mês em pequenos gastos recorrentes${leak.trend === "UP" ? " (tendência de alta)" : ""}.`,
        priority,
        estimatedImpact: Math.round(leak.monthlyTotal * 0.4 * 100) / 100,
        metadata,
      });
    }

    const topSpend = input.spendingHealth[0];
    if (topSpend && topSpend.monthlyAmount >= 200) {
      const target = Math.round(topSpend.monthlyAmount * 0.7 * 100) / 100;
      const metadata: ReduceExpensesMetadata = {
        category: topSpend.key,
        currentSpending: topSpend.monthlyAmount,
        targetSpending: target,
      };
      push({
        id: `spend-${topSpend.key}`,
        type: "REDUCE_SUPERFLUOUS_EXPENSES",
        title: `Reduzir gastos em ${topSpend.label}`,
        description: `Você gasta R$ ${topSpend.monthlyAmount.toFixed(2)}/mês (${topSpend.percentOfIncome}% da renda) em ${topSpend.label.toLowerCase()}.`,
        priority: topSpend.percentOfIncome > 15 ? "HIGH" : "MEDIUM",
        estimatedImpact: Math.round(topSpend.monthlyAmount * 0.3 * 100) / 100,
        metadata,
      });
    }

    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return actions.sort(
      (a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        (b.estimatedImpact ?? 0) - (a.estimatedImpact ?? 0),
    );
  }
}
