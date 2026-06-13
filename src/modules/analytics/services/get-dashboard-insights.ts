import { getTenantPrisma } from "@/lib/prisma-tenant";

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type MonthlyInsight = {
  month: string;
  monthIndex: number;
  income: number;
  expense: number;
  balance: number;
};

export type CategoryInsight = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
};

export type DashboardInsightSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  bestMonth: string | null;
  worstMonth: string | null;
  topCategoryName: string | null;
};

export type DashboardInsightsOutput = {
  monthly: MonthlyInsight[];
  topCategories: CategoryInsight[];
  summary: DashboardInsightSummary;
};

type MonthlyAggregateRow = {
  month_num: string;
  type: string;
  total: string | number;
};

type TopCategoryRow = {
  categoryId: string;
  categoryName: string;
  total: string | number;
};

function monthLabel(monthIndex: number): string {
  return MONTH_LABELS[monthIndex - 1] ?? String(monthIndex);
}

function buildSummary(
  monthly: MonthlyInsight[],
  topCategories: CategoryInsight[],
): DashboardInsightSummary {
  const totalIncome = monthly.reduce((sum, row) => sum + row.income, 0);
  const totalExpense = monthly.reduce((sum, row) => sum + row.expense, 0);
  const activeMonths = monthly.filter((row) => row.income > 0 || row.expense > 0);

  const best =
    activeMonths.length > 0
      ? activeMonths.reduce((current, row) => (row.balance >= current.balance ? row : current))
      : null;
  const worst =
    activeMonths.length > 0
      ? activeMonths.reduce((current, row) => (row.balance <= current.balance ? row : current))
      : null;

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    bestMonth: best ? monthLabel(best.monthIndex) : null,
    worstMonth: worst ? monthLabel(worst.monthIndex) : null,
    topCategoryName: topCategories[0]?.categoryName ?? null,
  };
}

export async function getDashboardInsights(
  userId: string,
  period?: { year: number; month?: number },
): Promise<DashboardInsightsOutput> {
  const prisma = getTenantPrisma(userId);
  const now = new Date();
  const targetYear = period?.year ?? now.getFullYear();

  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear + 1, 0, 1);

  const rawMonthly = await prisma.$queryRaw<MonthlyAggregateRow[]>`
    SELECT
      TO_CHAR(date, 'MM') AS month_num,
      type,
      SUM(amount) AS total
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND date >= ${startDate}
      AND date < ${endDate}
      AND type IN ('INCOME', 'EXPENSE')
    GROUP BY TO_CHAR(date, 'MM'), type
  `;

  const monthlyMap = new Map<string, { income: number; expense: number }>();
  for (let i = 1; i <= 12; i += 1) {
    monthlyMap.set(String(i).padStart(2, "0"), { income: 0, expense: 0 });
  }

  for (const row of rawMonthly) {
    const monthData = monthlyMap.get(row.month_num);
    if (!monthData) continue;
    const total = Number(row.total);
    if (row.type === "INCOME") {
      monthData.income = total;
    } else if (row.type === "EXPENSE") {
      monthData.expense = total;
    }
  }

  const monthly: MonthlyInsight[] = Array.from(monthlyMap.entries()).map(([monthKey, data]) => {
    const monthIndex = Number(monthKey);
    return {
      month: `${targetYear}-${monthKey}`,
      monthIndex,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    };
  });

  const targetMonth = period?.month ?? now.getMonth() + 1;
  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 1);

  const rawTopCategories = await prisma.$queryRaw<TopCategoryRow[]>`
    SELECT
      t."categoryId",
      c.name AS "categoryName",
      SUM(t.amount) AS total
    FROM "Transaction" t
    JOIN "Category" c ON t."categoryId" = c.id
    WHERE t."userId" = ${userId}
      AND t.type = 'EXPENSE'
      AND t.date >= ${monthStart}
      AND t.date < ${monthEnd}
      AND t."categoryId" IS NOT NULL
    GROUP BY t."categoryId", c.name
    ORDER BY total DESC
    LIMIT 5
  `;

  const topAmounts = rawTopCategories.map((row) => Number(row.total));
  const topTotal = topAmounts.reduce((sum, value) => sum + value, 0);

  const topCategories: CategoryInsight[] = rawTopCategories.map((row) => {
    const amount = Number(row.total);
    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      amount,
      percentage: topTotal > 0 ? (amount / topTotal) * 100 : 0,
    };
  });

  return {
    monthly,
    topCategories,
    summary: buildSummary(monthly, topCategories),
  };
}
