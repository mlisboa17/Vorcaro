import type { PrismaClient } from "@prisma/client";
import { TtlMemoryCache } from "@/lib/cache/ttl-memory-cache";
import { FINANCIAL_MEMORY_CACHE_TTL_MS } from "../../domain/constants";
import {
  VORCARO_INSUFFICIENT_HISTORY_MESSAGE,
  type FinancialAchievementRecord,
  type FinancialEvolutionProfileRecord,
  type FinancialTimelineEventRecord,
} from "../../domain/types/financial-memory";
import { PrismaFinancialMemoryRepository } from "../../infrastructure/repositories/prisma-financial-memory.repository";
import { FinancialComparisonService } from "./financial-comparison.service";
import { FinancialEvolutionProfileService } from "./financial-evolution-profile.service";
import { FinancialAchievementService } from "./financial-achievement.service";
import { EvolutionHealthScoreService } from "./evolution-health-score.service";
import { FinancialTimelineEngineService } from "./financial-timeline-engine.service";

export class FinancialMemoryQueryService {
  private readonly refreshCache = new TtlMemoryCache<true>(FINANCIAL_MEMORY_CACHE_TTL_MS);
  private readonly repo: PrismaFinancialMemoryRepository;
  private readonly comparison: FinancialComparisonService;
  private readonly evolution: FinancialEvolutionProfileService;
  private readonly achievements: FinancialAchievementService;
  private readonly healthEvolution: EvolutionHealthScoreService;
  private readonly engine: FinancialTimelineEngineService;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaFinancialMemoryRepository(prisma);
    this.comparison = new FinancialComparisonService(prisma);
    this.evolution = new FinancialEvolutionProfileService(prisma);
    this.achievements = new FinancialAchievementService(prisma);
    this.healthEvolution = new EvolutionHealthScoreService(prisma);
    this.engine = new FinancialTimelineEngineService(prisma);
  }

  readonly insufficientHistoryMessage = VORCARO_INSUFFICIENT_HISTORY_MESSAGE;

  async refresh(userId: string) {
    if (this.refreshCache.get(userId)) {
      return {
        userId,
        snapshotsRecorded: 0,
        eventsCreated: 0,
        achievementsUnlocked: 0,
        durationMs: 0,
      };
    }
    const result = await this.engine.runForUser(userId);
    this.refreshCache.set(userId, true);
    return result;
  }

  async getTimeline(
    userId: string,
    pageSize = 30,
    page = 1,
  ): Promise<{
    events: FinancialTimelineEventRecord[];
    total: number;
    historyDaysAvailable: number;
    hasSufficientHistory: boolean;
  }> {
    const historyDays = await this.comparison.getHistoryDaysAvailable(userId);
    const { items, total } = await this.repo.listTimelineEvents(userId, { page, pageSize });
    return {
      events: items,
      total,
      historyDaysAvailable: historyDays,
      hasSufficientHistory: this.comparison.hasSufficientHistory(historyDays),
    };
  }

  async getEvolution(userId: string): Promise<{
    profile: FinancialEvolutionProfileRecord;
    healthScore: Awaited<ReturnType<EvolutionHealthScoreService["compute"]>>;
    comparisons: Awaited<ReturnType<FinancialComparisonService["compareAll"]>>;
    hasSufficientHistory: boolean;
  }> {
    const historyDays = await this.comparison.getHistoryDaysAvailable(userId);
    const hasSufficientHistory = this.comparison.hasSufficientHistory(historyDays);
    const [profile, healthScore, comparisons] = await Promise.all([
      this.evolution.compute(userId),
      this.healthEvolution.compute(userId),
      this.comparison.compareAll(userId),
    ]);
    return { profile, healthScore, comparisons, hasSufficientHistory };
  }

  async getAchievements(userId: string, pageSize = 30): Promise<FinancialAchievementRecord[]> {
    const { items } = await this.repo.listAchievements(userId, { page: 1, pageSize });
    return items;
  }

  async getTrendsSummary(userId: string): Promise<{
    hasSufficientHistory: boolean;
    profile: FinancialEvolutionProfileRecord | null;
    summary: string;
  }> {
    const historyDays = await this.comparison.getHistoryDaysAvailable(userId);
    const hasSufficientHistory = this.comparison.hasSufficientHistory(historyDays);
    if (!hasSufficientHistory) {
      return { hasSufficientHistory: false, profile: null, summary: this.insufficientHistoryMessage };
    }
    const profile = await this.evolution.compute(userId);
    const lines = [
      `Saúde: ${profile.healthTrend}`,
      `Patrimônio: ${profile.netWorthTrend}`,
      `Fluxo de caixa: ${profile.cashflowTrend}`,
      `Gastos: ${profile.spendingTrend}`,
      `Dívida: ${profile.debtTrend}`,
      `Metas: ${profile.goalTrend}`,
    ];
    return { hasSufficientHistory: true, profile, summary: lines.join(" · ") };
  }
}
