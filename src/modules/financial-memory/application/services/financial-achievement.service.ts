import type { PrismaClient } from "@prisma/client";
import type { FinancialAchievementRecord } from "../../domain/types/financial-memory";
import { PrismaFinancialMemoryRepository } from "../../infrastructure/repositories/prisma-financial-memory.repository";
import { FinancialComparisonService } from "./financial-comparison.service";
import { financialMemoryObservability } from "./financial-memory-observability.service";

export class FinancialAchievementService {
  private readonly repo: PrismaFinancialMemoryRepository;
  private readonly comparison: FinancialComparisonService;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaFinancialMemoryRepository(prisma);
    this.comparison = new FinancialComparisonService(prisma);
  }

  async list(userId: string, pageSize = 50): Promise<FinancialAchievementRecord[]> {
    const { items } = await this.repo.listAchievements(userId, { page: 1, pageSize });
    return items;
  }

  async evaluateAfterEngineRun(
    userId: string,
    context: {
      healthScore: number;
      netWorth: number;
      monthlyExpenses: number;
      moneyLeakCount: number;
      goalsAchievedRecently: number;
    },
  ): Promise<number> {
    let unlocked = 0;

    const cmp30 = await this.comparison.compare(userId, 30);
    if (cmp30.hasSufficientHistory && cmp30.deltas.healthScore != null && cmp30.deltas.healthScore >= 10) {
      const r = await this.repo.unlockAchievement({
        userId,
        achievementKey: "health_score_improved_10",
        title: "Saúde financeira em alta",
        description: `Seu score subiu ${cmp30.deltas.healthScore} pontos nos últimos 30 dias.`,
        metadata: { delta: cmp30.deltas.healthScore },
      });
      if (r.created) {
        unlocked += 1;
        financialMemoryObservability.recordAchievementUnlocked();
      }
    }

    if (
      cmp30.hasSufficientHistory &&
      cmp30.deltas.netWorthPercent != null &&
      cmp30.deltas.netWorthPercent >= 10
    ) {
      const r = await this.repo.unlockAchievement({
        userId,
        achievementKey: "net_worth_growth_10pct",
        title: "Patrimônio em expansão",
        description: `Patrimônio líquido cresceu ${cmp30.deltas.netWorthPercent.toFixed(1)}% em 30 dias.`,
      });
      if (r.created) {
        unlocked += 1;
        financialMemoryObservability.recordAchievementUnlocked();
      }
    }

    if (context.goalsAchievedRecently > 0) {
      const r = await this.repo.unlockAchievement({
        userId,
        achievementKey: "first_goal_achieved",
        title: "Meta alcançada",
        description: "Você concluiu uma meta financeira — marco importante na trajetória.",
      });
      if (r.created) {
        unlocked += 1;
        financialMemoryObservability.recordAchievementUnlocked();
      }
    }

    if (context.moneyLeakCount === 0 && context.monthlyExpenses > 0) {
      const r = await this.repo.unlockAchievement({
        userId,
        achievementKey: "no_money_leaks",
        title: "Sem vazamentos detectados",
        description: "Nenhum vazamento recorrente relevante no momento.",
      });
      if (r.created) {
        unlocked += 1;
        financialMemoryObservability.recordAchievementUnlocked();
      }
    }

    return unlocked;
  }
}
