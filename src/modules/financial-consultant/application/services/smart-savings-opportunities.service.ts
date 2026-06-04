import { computePriorityScore, getActionEffort } from "../../domain/services/advisor-action-effort";
import type {
  AdvisorAction,
  SavingsOpportunity,
  SpendingHealthCategory,
  SubscriptionDuplicateFinding,
} from "../../domain/types/advisor-action";
import type { MoneyLeakFinding } from "../../domain/types/advisor-action";

type Candidate = Omit<SavingsOpportunity, "rank">;

export class SmartSavingsOpportunitiesService {
  build(
    actions: AdvisorAction[],
    duplicates: SubscriptionDuplicateFinding[],
    moneyLeaks: MoneyLeakFinding[],
    spendingHealth: SpendingHealthCategory[],
  ): SavingsOpportunity[] {
    const candidates: Candidate[] = [];

    for (const dup of duplicates) {
      const { effort, effortWeight } = getActionEffort("REVIEW_SUBSCRIPTIONS");
      const savings = dup.potentialMonthlySaving;
      candidates.push({
        title: `Cancelar assinatura duplicada (${dup.normalizedName})`,
        description: `Possível duplicidade em ${dup.normalizedName} (${dup.suspectedIds.length} lançamentos).`,
        estimatedMonthlySavings: savings,
        effort,
        effortWeight,
        priorityScore: computePriorityScore(savings, effortWeight),
        actionType: "REVIEW_SUBSCRIPTIONS",
        actionId: `dup-${dup.duplicateGroup}`,
      });
    }

    const delivery = spendingHealth.find((c) => c.key === "DELIVERY");
    if (delivery && delivery.monthlyAmount >= 150) {
      const { effort, effortWeight } = getActionEffort("REDUCE_SUPERFLUOUS_EXPENSES");
      const savings = Math.round(delivery.monthlyAmount * 0.45 * 100) / 100;
      candidates.push({
        title: "Reduzir delivery",
        description: `Você gasta cerca de R$ ${delivery.monthlyAmount.toFixed(2)}/mês em delivery.`,
        estimatedMonthlySavings: savings,
        effort,
        effortWeight,
        priorityScore: computePriorityScore(savings, effortWeight),
        actionType: "REDUCE_SUPERFLUOUS_EXPENSES",
      });
    }

    for (const leak of moneyLeaks) {
      const { effort, effortWeight } = getActionEffort("REVIEW_SMALL_EXPENSES");
      const savings = Math.round(leak.monthlyTotal * 0.4 * 100) / 100;
      candidates.push({
        title: "Revisar serviços pouco usados",
        description: `${leak.itemCount} gasto(s) pequeno(s) somam R$ ${leak.monthlyTotal.toFixed(2)}/mês.`,
        estimatedMonthlySavings: savings,
        effort,
        effortWeight,
        priorityScore: computePriorityScore(savings, effortWeight),
        actionType: "REVIEW_SMALL_EXPENSES",
        actionId: "money-leak",
      });
    }

    for (const action of actions) {
      if (!action.estimatedImpact || action.estimatedImpact <= 0) continue;
      if (candidates.some((c) => c.actionId === action.id)) continue;
      candidates.push({
        title: action.title,
        description: action.description,
        estimatedMonthlySavings: action.estimatedImpact,
        effort: action.effort,
        effortWeight: action.effortWeight,
        priorityScore: computePriorityScore(action.estimatedImpact, action.effortWeight),
        actionType: action.type,
        actionId: action.id,
      });
    }

    candidates.sort((a, b) => b.priorityScore - a.priorityScore);

    return candidates.slice(0, 3).map((c, i) => ({ ...c, rank: i + 1 }));
  }
}
