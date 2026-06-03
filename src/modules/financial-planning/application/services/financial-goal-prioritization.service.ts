import type { FinancialGoal, Prisma } from "@prisma/client";
import { decimalToCents } from "../../domain/money";

const TYPE_RANK: Record<FinancialGoal["tipo"], number> = {
  EMERGENCY_FUND: 1,
  DEBT_SETTLEMENT: 2,
  VEHICLE: 3,
  REAL_ESTATE: 3,
  EDUCATION: 3,
  RETIREMENT: 5,
  CUSTOM: 6,
};

export type PrioritizedGoalRef = Pick<
  FinancialGoal,
  "id" | "tipo" | "prioridade" | "dataObjetivo" | "status" | "createdAt"
>;

export class FinancialGoalPrioritizationService {
  /** Menor score = maior prioridade. */
  score(goal: PrioritizedGoalRef, referenceDate = new Date()): number {
    let rank = TYPE_RANK[goal.tipo] ?? 99;

    if (goal.tipo === "CUSTOM" || goal.tipo === "VEHICLE" || goal.tipo === "EDUCATION") {
      if (goal.dataObjetivo) {
        const months =
          (goal.dataObjetivo.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (months <= 12) rank = 3;
      }
    }

    const priorityBoost =
      goal.prioridade === "HIGH" ? 0 : goal.prioridade === "MEDIUM" ? 0.15 : 0.3;

    const statusBoost = goal.status === "ACHIEVED" ? 100 : 0;

    return rank + priorityBoost + statusBoost;
  }

  sort<T extends PrioritizedGoalRef>(goals: T[]): T[] {
    const ref = new Date();
    return [...goals].sort((a, b) => {
      const diff = this.score(a, ref) - this.score(b, ref);
      if (diff !== 0) return diff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  pickHighestValueGoal<T extends PrioritizedGoalRef & { valorObjetivo: Prisma.Decimal }>(
    goals: T[],
  ): T | null {
    const active = goals.filter((g) => g.status === "ACTIVE");
    if (active.length === 0) return null;
    return active.reduce((best, g) =>
      decimalToCents(g.valorObjetivo) > decimalToCents(best.valorObjetivo) ? g : best,
    );
  }
}
