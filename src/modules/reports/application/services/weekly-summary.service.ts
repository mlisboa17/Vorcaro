import type { PrismaClient } from "@prisma/client";

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  total: number;
}

export interface PeriodSummary {
  sinceDays: number;
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  transactionCount: number;
  topCategories: CategoryTotal[];
  activeAlerts: number;
}

/** Normaliza o nº de dias do período (default 7, entre 1 e 90). */
export function normalizeSinceDays(days: number | null | undefined): number {
  if (!days || !Number.isFinite(days)) return 7;
  return Math.min(90, Math.max(1, Math.floor(days)));
}

/**
 * Agrega totais do período (despesas, receitas, saldo líquido) + top categorias
 * de despesa. Usa a data efetiva (dataCaixa quando houver, senão date).
 */
export class WeeklySummaryService {
  constructor(private readonly prisma: PrismaClient) {}

  async build(userId: string, sinceDaysInput?: number): Promise<PeriodSummary> {
    const sinceDays = normalizeSinceDays(sinceDaysInput);
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ dataCaixa: { gte: since } }, { AND: [{ dataCaixa: null }, { date: { gte: since } }] }],
      },
      select: { type: true, amount: true, categoryId: true, category: { select: { name: true } } },
    });

    let totalExpenses = 0;
    let totalIncome = 0;
    const byCategory = new Map<string, CategoryTotal>();

    for (const tx of txs) {
      const value = Math.abs(Number(tx.amount));
      if (tx.type === "INCOME") {
        totalIncome += value;
      } else if (tx.type === "EXPENSE") {
        totalExpenses += value;
        const key = tx.categoryId ?? "__none__";
        const entry = byCategory.get(key) ?? {
          categoryId: tx.categoryId,
          name: tx.category?.name ?? "Sem categoria",
          total: 0,
        };
        entry.total += value;
        byCategory.set(key, entry);
      }
      // TRANSFER é ignorado nos totais de despesa/receita.
    }

    const topCategories = [...byCategory.values()].sort((a, b) => b.total - a.total).slice(0, 3);

    let activeAlerts = 0;
    try {
      const { FinancialAlertQueryService } = await import(
        "@/modules/financial-alerts/application/services/financial-alert-query.service"
      );
      const summary = await new FinancialAlertQueryService(this.prisma).summary(userId);
      activeAlerts = (summary as { totalOpen?: number }).totalOpen ?? 0;
    } catch {
      activeAlerts = 0;
    }

    return {
      sinceDays,
      totalExpenses,
      totalIncome,
      netBalance: totalIncome - totalExpenses,
      transactionCount: txs.length,
      topCategories,
      activeAlerts,
    };
  }
}
