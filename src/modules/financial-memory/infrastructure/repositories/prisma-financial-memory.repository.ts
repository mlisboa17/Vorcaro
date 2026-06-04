import type { PrismaClient } from "@prisma/client";
import type { FinancialTimelineEventType, FinancialTimelineImpactLevel } from "@prisma/client";
import type {
  FinancialAchievementRecord,
  FinancialTimelineEventRecord,
  FinancialMetricSnapshotRecord,
} from "../../domain/types/financial-memory";
import { startOfUtcDay } from "../../domain/services/timeline-fingerprint";

export class PrismaFinancialMemoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertTimelineEvent(input: {
    userId: string;
    eventType: FinancialTimelineEventType;
    title: string;
    description: string;
    eventDate: Date;
    impactLevel: FinancialTimelineImpactLevel;
    metadata?: Record<string, unknown>;
    fingerprint: string;
  }): Promise<{ created: boolean; record: FinancialTimelineEventRecord }> {
    const existing = await this.db.financialTimelineEvent.findUnique({
      where: { userId_fingerprint: { userId: input.userId, fingerprint: input.fingerprint } },
    });
    if (existing) {
      return { created: false, record: this.toTimelineEvent(existing) };
    }
    const row = await this.db.financialTimelineEvent.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        eventDate: input.eventDate,
        impactLevel: input.impactLevel,
        metadata: (input.metadata ?? undefined) as object | undefined,
        fingerprint: input.fingerprint,
      },
    });
    return { created: true, record: this.toTimelineEvent(row) };
  }

  async listTimelineEvents(
    userId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<{ items: FinancialTimelineEventRecord[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 30, 100);
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.db.financialTimelineEvent.findMany({
        where: { userId },
        orderBy: { eventDate: "desc" },
        skip,
        take: pageSize,
      }),
      this.db.financialTimelineEvent.count({ where: { userId } }),
    ]);
    return { items: rows.map((r) => this.toTimelineEvent(r)), total };
  }

  async upsertDailySnapshot(input: {
    userId: string;
    snapshotDate: Date;
    healthScore: number;
    netWorth: number;
    totalDebt: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyCashflow: number;
  }): Promise<{ created: boolean }> {
    const day = startOfUtcDay(input.snapshotDate);
    const existing = await this.db.financialMetricSnapshot.findUnique({
      where: { userId_snapshotDate: { userId: input.userId, snapshotDate: day } },
    });
    if (existing) {
      await this.db.financialMetricSnapshot.update({
        where: { id: existing.id },
        data: {
          healthScore: input.healthScore,
          netWorth: input.netWorth,
          totalDebt: input.totalDebt,
          monthlyIncome: input.monthlyIncome,
          monthlyExpenses: input.monthlyExpenses,
          monthlyCashflow: input.monthlyCashflow,
        },
      });
      return { created: false };
    }
    await this.db.financialMetricSnapshot.create({
      data: {
        userId: input.userId,
        snapshotDate: day,
        healthScore: input.healthScore,
        netWorth: input.netWorth,
        totalDebt: input.totalDebt,
        monthlyIncome: input.monthlyIncome,
        monthlyExpenses: input.monthlyExpenses,
        monthlyCashflow: input.monthlyCashflow,
      },
    });
    return { created: true };
  }

  async findSnapshotOnOrBefore(
    userId: string,
    targetDate: Date,
  ): Promise<FinancialMetricSnapshotRecord | null> {
    const row = await this.db.financialMetricSnapshot.findFirst({
      where: { userId, snapshotDate: { lte: startOfUtcDay(targetDate) } },
      orderBy: { snapshotDate: "desc" },
    });
    return row ? this.toSnapshot(row) : null;
  }

  async getLatestSnapshot(userId: string): Promise<FinancialMetricSnapshotRecord | null> {
    const row = await this.db.financialMetricSnapshot.findFirst({
      where: { userId },
      orderBy: { snapshotDate: "desc" },
    });
    return row ? this.toSnapshot(row) : null;
  }

  async getFirstSnapshotDate(userId: string): Promise<Date | null> {
    const row = await this.db.financialMetricSnapshot.findFirst({
      where: { userId },
      orderBy: { snapshotDate: "asc" },
      select: { snapshotDate: true },
    });
    return row?.snapshotDate ?? null;
  }

  async unlockAchievement(input: {
    userId: string;
    achievementKey: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ created: boolean; record: FinancialAchievementRecord }> {
    const existing = await this.db.financialAchievement.findUnique({
      where: {
        userId_achievementKey: { userId: input.userId, achievementKey: input.achievementKey },
      },
    });
    if (existing) {
      return { created: false, record: this.toAchievement(existing) };
    }
    const row = await this.db.financialAchievement.create({
      data: {
        userId: input.userId,
        achievementKey: input.achievementKey,
        title: input.title,
        description: input.description,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
    return { created: true, record: this.toAchievement(row) };
  }

  async listAchievements(
    userId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<{ items: FinancialAchievementRecord[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 30, 100);
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.db.financialAchievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.db.financialAchievement.count({ where: { userId } }),
    ]);
    return { items: rows.map((r) => this.toAchievement(r)), total };
  }

  async countGoalsAchievedSince(userId: string, since: Date): Promise<number> {
    return this.db.financialGoal.count({
      where: { userId, status: "ACHIEVED", updatedAt: { gte: since } },
    });
  }

  private toTimelineEvent(row: {
    id: string;
    userId: string;
    eventType: FinancialTimelineEventType;
    title: string;
    description: string;
    eventDate: Date;
    impactLevel: FinancialTimelineImpactLevel;
    metadata: unknown;
    fingerprint: string;
    createdAt: Date;
  }): FinancialTimelineEventRecord {
    return {
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      title: row.title,
      description: row.description,
      eventDate: row.eventDate,
      impactLevel: row.impactLevel,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      fingerprint: row.fingerprint,
      createdAt: row.createdAt,
    };
  }

  private toSnapshot(row: {
    id: string;
    userId: string;
    snapshotDate: Date;
    healthScore: number;
    netWorth: { toNumber(): number };
    totalDebt: { toNumber(): number };
    monthlyIncome: { toNumber(): number };
    monthlyExpenses: { toNumber(): number };
    monthlyCashflow: { toNumber(): number };
  }): FinancialMetricSnapshotRecord {
    return {
      id: row.id,
      userId: row.userId,
      snapshotDate: row.snapshotDate,
      healthScore: row.healthScore,
      netWorth: row.netWorth.toNumber(),
      totalDebt: row.totalDebt.toNumber(),
      monthlyIncome: row.monthlyIncome.toNumber(),
      monthlyExpenses: row.monthlyExpenses.toNumber(),
      monthlyCashflow: row.monthlyCashflow.toNumber(),
    };
  }

  private toAchievement(row: {
    id: string;
    achievementKey: string;
    title: string;
    description: string;
    unlockedAt: Date;
    metadata: unknown;
  }): FinancialAchievementRecord {
    return {
      id: row.id,
      achievementKey: row.achievementKey,
      title: row.title,
      description: row.description,
      unlockedAt: row.unlockedAt,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    };
  }
}
