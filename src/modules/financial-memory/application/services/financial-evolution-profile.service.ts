import type { PrismaClient } from "@prisma/client";
import type { FinancialTrendDirection } from "@prisma/client";
import type { FinancialEvolutionProfileRecord } from "../../domain/types/financial-memory";
import {
  resolveTrendDirection,
  resolveTrendDirectionInverse,
} from "../../domain/services/timeline-fingerprint";
import { FinancialComparisonService } from "./financial-comparison.service";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";
import { financialMemoryObservability } from "./financial-memory-observability.service";

export class FinancialEvolutionProfileService {
  private readonly comparison: FinancialComparisonService;
  private readonly consultant: IntelligentAdvisorService;
  private readonly planning: FinancialPlanningService;

  constructor(prisma: PrismaClient) {
    this.comparison = new FinancialComparisonService(prisma);
    this.consultant = new IntelligentAdvisorService(prisma);
    this.planning = new FinancialPlanningService(prisma);
  }

  /** Perfil calculado sob demanda — sem persistência. */
  async compute(userId: string): Promise<FinancialEvolutionProfileRecord> {
    financialMemoryObservability.recordEvolutionQuery();

    const [historyDays, cmp90, cmp30, consultation, goals] = await Promise.all([
      this.comparison.getHistoryDaysAvailable(userId),
      this.comparison.compare(userId, 90),
      this.comparison.compare(userId, 30),
      this.consultant.consult(userId),
      this.planning.getGoals(userId),
    ]);

    const goalsAtRisk = goals.filter(
      (g) =>
        g.status === "ACTIVE" &&
        (!g.viabilidade.viavel ||
          g.viabilidade.risco === "HIGH" ||
          g.viabilidade.statusVisual === "RISCO_ALTO"),
    ).length;
    const goalsAchieved = goals.filter((g) => g.status === "ACHIEVED").length;

    const healthTrend = resolveTrendDirection(cmp30.deltas.healthScore);
    const netWorthTrend = resolveTrendDirection(cmp90.deltas.netWorthPercent);
    const cashflowTrend = resolveTrendDirection(cmp30.deltas.monthlyCashflow);
    const spendingTrend = resolveTrendDirectionInverse(cmp30.deltas.monthlyExpenses);
    const debtTrend = resolveTrendDirectionInverse(
      cmp90.past && cmp90.current
        ? percentDebtDelta(cmp90.current.totalDebt, cmp90.past.totalDebt)
        : null,
    );

    let goalTrend: FinancialTrendDirection = "STABLE";
    if (goalsAchieved > 0) goalTrend = "IMPROVING";
    else if (goalsAtRisk > 0) goalTrend = "DECLINING";

    const trends = [healthTrend, netWorthTrend, cashflowTrend, spendingTrend, debtTrend, goalTrend];
    if (trends.some((t) => t !== "STABLE")) {
      financialMemoryObservability.recordTrendDetected();
    }

    return {
      healthTrend,
      cashflowTrend,
      spendingTrend,
      debtTrend,
      goalTrend,
      netWorthTrend,
      historyDaysAvailable: historyDays,
      lastHealthScore: consultation.healthScore.score,
      previousHealthScore: cmp30.past?.healthScore ?? null,
    };
  }
}

function percentDebtDelta(current: number, past: number): number | null {
  if (past === 0) return null;
  return ((current - past) / Math.abs(past)) * 100;
}
