import type { Prisma } from "@prisma/client";

export function buildEffectiveDateRangeFilter(
  startDate?: Date,
  endDate?: Date,
): Prisma.TransactionWhereInput | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const range: Prisma.DateTimeFilter = {
    ...(startDate ? { gte: startDate } : {}),
    ...(endDate ? { lte: endDate } : {}),
  };

  return {
    OR: [{ dataCaixa: range }, { AND: [{ dataCaixa: null }, { date: range }] }],
  };
}
