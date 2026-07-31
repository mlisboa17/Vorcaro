import type { PrismaClient } from "@prisma/client";
import type { PeriodSummary } from "./weekly-summary.service";

export interface CategoryInsight {
  name: string;
  currentSpent: number;
  historicalAverage: number;
  percentageChange: number; // negativo = economia, positivo = mais gasto
  totalTransactions: number;
  largestTransaction?: { description: string; amount: number };
}

export interface WeeklyInsight {
  weekStartDate: string;
  topIncreases: CategoryInsight[]; // categorias que aumentaram
  topSavings: CategoryInsight[]; // categorias que economizaram
  largestExpense: { description: string; amount: number; category: string } | null;
  spendingTrend: "stable" | "increasing" | "decreasing";
  anomalies: string[]; // alertas de comportamento incomum
}

/**
 * Sprint 23.1 — Análise de padrões e insights de gastos.
 * Compara semana atual com histórico para identificar tendências e anomalias.
 */
export class WeeklyInsightsService {
  constructor(private readonly prisma: PrismaClient) {}

  async buildInsights(userId: string, sinceDays: number = 7): Promise<WeeklyInsight> {
    const today = new Date();
    const weekStart = new Date(today.getTime() - sinceDays * 86400000);
    const weekStartStr = this.toDateStr(weekStart);

    // Dados da semana atual
    const currentWeek = await this.getWeekData(userId, sinceDays);

    // Dados históricos (últimos 90 dias excluindo semana atual)
    const historical = await this.getHistoricalAverage(userId, sinceDays, 90);

    // Análise comparativa
    const insights: WeeklyInsight = {
      weekStartDate: weekStartStr,
      topIncreases: [],
      topSavings: [],
      largestExpense: null,
      spendingTrend: "stable",
      anomalies: [],
    };

    // Compara cada categoria
    for (const [categoryName, currentSpent] of currentWeek.byCategory) {
      const historicalAvg = historical.byCategory.get(categoryName) || 0;
      const change = historicalAvg > 0 ? ((currentSpent - historicalAvg) / historicalAvg) * 100 : 0;

      const insight: CategoryInsight = {
        name: categoryName,
        currentSpent,
        historicalAverage: historicalAvg,
        percentageChange: Math.round(change),
        totalTransactions: currentWeek.categoryTransactions.get(categoryName) || 0,
        largestTransaction: currentWeek.categoryLargestTx.get(categoryName),
      };

      if (change > 20) {
        // Aumentou mais de 20%
        insights.topIncreases.push(insight);
      } else if (historicalAvg > 0 && currentSpent === 0) {
        // Economizou completamente
        insights.topSavings.push(insight);
      }
    }

    // Ordena por magnitude
    insights.topIncreases.sort((a, b) => b.percentageChange - a.percentageChange);
    insights.topSavings.sort((a, b) => b.historicalAverage - a.historicalAverage);

    // Maior gasto da semana
    insights.largestExpense = currentWeek.largestTransaction || null;

    // Tendência geral
    const avgHistorical = Array.from(historical.byCategory.values()).reduce((a, b) => a + b, 0) /
      Math.max(1, historical.byCategory.size) || 0;
    const currentTotal = currentWeek.totalExpenses;
    const trendChange = avgHistorical > 0 ? ((currentTotal - avgHistorical) / avgHistorical) * 100 : 0;

    if (trendChange > 15) {
      insights.spendingTrend = "increasing";
      insights.anomalies.push(`📈 Gasto aumentou ${Math.round(trendChange)}% vs média histórica`);
    } else if (trendChange < -15) {
      insights.spendingTrend = "decreasing";
    }

    return insights;
  }

  private async getWeekData(
    userId: string,
    sinceDays: number,
  ): Promise<{
    totalExpenses: number;
    byCategory: Map<string, number>;
    categoryTransactions: Map<string, number>;
    categoryLargestTx: Map<string, { description: string; amount: number }>;
    largestTransaction: { description: string; amount: number; category: string } | null;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        OR: [{ dataCaixa: { gte: since } }, { AND: [{ dataCaixa: null }, { date: { gte: since } }] }],
      },
      select: {
        amount: true,
        description: true,
        category: { select: { name: true } },
      },
    });

    const byCategory = new Map<string, number>();
    const categoryTransactions = new Map<string, number>();
    const categoryLargestTx = new Map<string, { description: string; amount: number }>();
    let largestOverall: { description: string; amount: number; category: string } | null = null;
    let totalExpenses = 0;

    for (const tx of txs) {
      const amount = Math.abs(Number(tx.amount));
      const catName = tx.category?.name || "Sem categoria";

      // Acumula por categoria
      byCategory.set(catName, (byCategory.get(catName) || 0) + amount);
      categoryTransactions.set(catName, (categoryTransactions.get(catName) || 0) + 1);

      // Maior transação por categoria
      const current = categoryLargestTx.get(catName);
      if (!current || amount > current.amount) {
        categoryLargestTx.set(catName, {
          description: tx.description || "Sem descrição",
          amount,
        });
      }

      // Maior transação geral
      if (!largestOverall || amount > largestOverall.amount) {
        largestOverall = {
          description: tx.description || "Sem descrição",
          amount,
          category: catName,
        };
      }

      totalExpenses += amount;
    }

    return {
      totalExpenses,
      byCategory,
      categoryTransactions,
      categoryLargestTx,
      largestTransaction: largestOverall,
    };
  }

  private async getHistoricalAverage(
    userId: string,
    excludeDays: number,
    lookbackDays: number,
  ): Promise<{ byCategory: Map<string, number> }> {
    const now = new Date();
    const excludeSince = new Date(now.getTime() - excludeDays * 86400000);
    const lookbackSince = new Date(now.getTime() - lookbackDays * 86400000);

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        OR: [
          { dataCaixa: { gte: lookbackSince, lt: excludeSince } },
          {
            AND: [
              { dataCaixa: null },
              { date: { gte: lookbackSince, lt: excludeSince } },
            ],
          },
        ],
      },
      select: {
        amount: true,
        category: { select: { name: true } },
      },
    });

    const byCategory = new Map<string, number>();
    const categoryCount = new Map<string, number>();

    for (const tx of txs) {
      const amount = Math.abs(Number(tx.amount));
      const catName = tx.category?.name || "Sem categoria";

      byCategory.set(catName, (byCategory.get(catName) || 0) + amount);
      categoryCount.set(catName, (categoryCount.get(catName) || 0) + 1);
    }

    // Calcula média (total / número de semanas)
    const weeks = Math.max(1, Math.ceil(lookbackDays / 7));
    for (const [cat, total] of byCategory) {
      byCategory.set(cat, total / weeks);
    }

    return { byCategory };
  }

  private toDateStr(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}
