import { getTenantPrisma } from "@/lib/prisma-tenant";

export interface CashflowPeriodData {
  period: string; // "MM/YYYY"
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export async function getCashflowAnalytics(userId: string): Promise<CashflowPeriodData[]> {
  const tenantDb = getTenantPrisma(userId);

  // Fetch all transactions for this tenant, ordered by date
  const transactions = await tenantDb.transaction.findMany({
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  const groups: Record<string, { income: number; expense: number }> = {};

  for (const tx of transactions) {
    const date = tx.date;
    if (!date) continue;

    // Use local or UTC year-month to avoid timezone offsets causing date mismatches
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`; // "YYYY-MM" for easy chronological sorting

    if (!groups[key]) {
      groups[key] = { income: 0, expense: 0 };
    }

    const value = Number(tx.amount?.toString() || 0);

    if (tx.type === "INCOME") {
      groups[key].income += value;
    } else if (tx.type === "EXPENSE") {
      groups[key].expense += value;
    }
  }

  const sortedKeys = Object.keys(groups).sort();
  const result: CashflowPeriodData[] = [];
  let cumulative = 0;

  for (const key of sortedKeys) {
    const { income, expense } = groups[key];
    const net = income - expense;
    cumulative += net;

    const [year, month] = key.split("-");
    const periodLabel = `${month}/${year}`;

    result.push({
      period: periodLabel,
      income,
      expense,
      net,
      cumulative,
    });
  }

  return result;
}
