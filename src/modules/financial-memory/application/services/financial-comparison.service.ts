import type { PrismaClient } from "@prisma/client";
import {
  COMPARISON_PERIODS_DAYS,
  MIN_HISTORY_DAYS_FOR_ANALYSIS,
  type ComparisonPeriodDays,
  type PeriodComparisonResult,
} from "../../domain/types/financial-memory";
import { percentChange } from "../../domain/services/timeline-fingerprint";
import { PrismaFinancialMemoryRepository } from "../../infrastructure/repositories/prisma-financial-memory.repository";
import { financialMemoryObservability } from "./financial-memory-observability.service";

export class FinancialComparisonService {
  private readonly repo: PrismaFinancialMemoryRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaFinancialMemoryRepository(prisma);
  }

  async getHistoryDaysAvailable(userId: string): Promise<number> {
    const first = await this.repo.getFirstSnapshotDate(userId);
    if (!first) return 0;
    const diff = Date.now() - first.getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  }

  hasSufficientHistory(historyDays: number): boolean {
    return historyDays >= MIN_HISTORY_DAYS_FOR_ANALYSIS;
  }

  async compare(userId: string, periodDays: ComparisonPeriodDays): Promise<PeriodComparisonResult> {
    financialMemoryObservability.recordEvolutionQuery();
    const historyDays = await this.getHistoryDaysAvailable(userId);
    const hasSufficientHistory = this.hasSufficientHistory(historyDays);

    const current = await this.repo.getLatestSnapshot(userId);
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() - periodDays);
    const past = await this.repo.findSnapshotOnOrBefore(userId, targetDate);

    const deltas = {
      healthScore:
        current && past ? current.healthScore - past.healthScore : null,
      netWorth: current && past ? current.netWorth - past.netWorth : null,
      netWorthPercent:
        current && past ? percentChange(current.netWorth, past.netWorth) : null,
      totalDebt: current && past ? current.totalDebt - past.totalDebt : null,
      monthlyCashflow:
        current && past ? current.monthlyCashflow - past.monthlyCashflow : null,
      monthlyExpenses:
        current && past ? current.monthlyExpenses - past.monthlyExpenses : null,
    };

    return {
      periodDays,
      hasSufficientHistory,
      current,
      past,
      deltas,
    };
  }

  async compareAll(userId: string): Promise<PeriodComparisonResult[]> {
    return Promise.all(COMPARISON_PERIODS_DAYS.map((d) => this.compare(userId, d)));
  }
}
