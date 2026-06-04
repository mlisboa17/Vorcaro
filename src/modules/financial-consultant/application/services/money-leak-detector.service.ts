import { normalizeMerchantText } from "../../domain/subscription-brands";
import type { AdvisorActionPriority } from "../../domain/types/advisor-action";
import type { MoneyLeakFinding } from "../../domain/types/advisor-action";
import type { RecurringExpenseRow } from "./subscription-detector.service";

const LEAK_KEYWORDS = [
  "app",
  "jogo",
  "game",
  "taxa",
  "tarifa",
  "servico",
  "serviço",
  "digital",
  "assinatura",
  "premium",
  "cloud",
  "storage",
];

const MAX_LEAK_AMOUNT = 80;
const MIN_MONTHS_ACTIVE = 3;

export type MonthlySpendPoint = {
  recurringId?: string;
  description: string;
  monthKey: string;
  amount: number;
};

export class MoneyLeakDetectorService {
  detect(
    recurring: RecurringExpenseRow[],
    monthsActiveById: Map<string, number>,
    monthlySpendPoints: MonthlySpendPoint[] = [],
  ): MoneyLeakFinding[] {
    const leakRows = recurring.filter((r) => {
      if (r.valor > MAX_LEAK_AMOUNT || r.valor <= 0) return false;
      const months = monthsActiveById.get(r.id) ?? 1;
      if (months < MIN_MONTHS_ACTIVE) return false;
      const norm = normalizeMerchantText(r.descricao);
      return LEAK_KEYWORDS.some((k) => norm.includes(k)) || r.valor <= 35;
    });

    if (leakRows.length === 0) return [];

    const historyByRecurring = this.buildMonthlyHistory(leakRows, monthlySpendPoints);
    const itemIds = leakRows.map((r) => r.id);
    const monthlyHistory = this.aggregateHistory(historyByRecurring, leakRows);
    const { trend, trendDeltaPercent } = this.resolveTrend(monthlyHistory);

    let suggestedPriority: AdvisorActionPriority = "LOW";
    if (trend === "UP" && this.isThreeMonthGrowth(monthlyHistory)) {
      suggestedPriority = "MEDIUM";
    }

    const monthlyTotal = leakRows.reduce((s, l) => s + l.valor, 0);

    return [
      {
        label: "Pequenos gastos recorrentes",
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        itemCount: leakRows.length,
        occurrences: leakRows.length,
        trend,
        trendDeltaPercent,
        suggestedPriority,
        itemIds,
        monthlyHistory,
      },
    ];
  }

  private buildMonthlyHistory(
    leakRows: RecurringExpenseRow[],
    points: MonthlySpendPoint[],
  ): Map<string, number[]> {
    const map = new Map<string, number[]>();
    const sortedMonths = [...new Set(points.map((p) => p.monthKey))].sort();

    for (const row of leakRows) {
      const norm = normalizeMerchantText(row.descricao);
      const series: number[] = [];

      for (const month of sortedMonths.slice(-3)) {
        const monthSum = points
          .filter(
            (p) =>
              p.monthKey === month &&
              (p.recurringId === row.id ||
                normalizeMerchantText(p.description) === norm),
          )
          .reduce((s, p) => s + p.amount, 0);
        series.push(monthSum > 0 ? monthSum : row.valor);
      }

      if (series.length === 0) {
        map.set(row.id, [row.valor, row.valor, row.valor]);
      } else {
        while (series.length < 3) series.unshift(series[0] ?? row.valor);
        map.set(row.id, series.slice(-3));
      }
    }

    return map;
  }

  private aggregateHistory(
    byId: Map<string, number[]>,
    leakRows: RecurringExpenseRow[],
  ): number[] {
    const months = 3;
    const totals = Array.from({ length: months }, () => 0);
    for (const row of leakRows) {
      const series = byId.get(row.id) ?? [row.valor, row.valor, row.valor];
      for (let i = 0; i < months; i++) {
        totals[i] += series[i] ?? row.valor;
      }
    }
    return totals.map((v) => Math.round(v * 100) / 100);
  }

  private resolveTrend(history: number[]): {
    trend: "STABLE" | "UP" | "DOWN";
    trendDeltaPercent?: number;
  } {
    if (history.length < 2) return { trend: "STABLE" };
    const first = history[0];
    const last = history[history.length - 1];
    if (first <= 0) return { trend: last > 0 ? "UP" : "STABLE" };
    const delta = ((last - first) / first) * 100;
    if (last > first * 1.1) return { trend: "UP", trendDeltaPercent: Math.round(delta) };
    if (last < first * 0.9) return { trend: "DOWN", trendDeltaPercent: Math.round(delta) };
    return { trend: "STABLE", trendDeltaPercent: Math.round(delta) };
  }

  private isThreeMonthGrowth(history: number[]): boolean {
    if (history.length < 3) return false;
    return history[1] > history[0] && history[2] > history[1];
  }
}
