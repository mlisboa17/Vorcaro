import type { PrismaClient } from "@prisma/client";
import { resolvePeriodPreset } from "@/lib/utils/date-periods";
import { isThirdPartyExpenseTransaction } from "@/lib/financial/receivable-transaction-metadata";

export interface MonthFinancialOverview {
  receitas: number;
  despesasCaixa: number;
  despesasDre: number;
  saldoMes: number;
}

export class MonthFinancialOverviewService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCurrentMonth(userId: string, reference = new Date()): Promise<MonthFinancialOverview> {
    const { startDate, endDate } = resolvePeriodPreset("current_month", reference);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { date: { gte: startDate, lte: endDate } },
          { dataCaixa: { gte: startDate, lte: endDate } },
        ],
      },
      select: { type: true, amount: true, date: true, dataCaixa: true, metadata: true },
    });

    let receitas = 0;
    let despesasDre = 0;
    let despesasCaixa = 0;

    for (const tx of transactions) {
      const amount = tx.amount.toNumber();
      const inDrePeriod = tx.date >= startDate && tx.date <= endDate;
      const cashDate = tx.dataCaixa ?? tx.date;
      const inCashPeriod = cashDate >= startDate && cashDate <= endDate;
      const thirdParty = isThirdPartyExpenseTransaction(tx.metadata);

      if (tx.type === "INCOME") {
        if (inDrePeriod) receitas += amount;
      }

      if (tx.type === "EXPENSE") {
        if (inDrePeriod && !thirdParty) despesasDre += amount;
        if (inCashPeriod) despesasCaixa += amount;
      }
    }

    return {
      receitas,
      despesasCaixa,
      despesasDre,
      saldoMes: receitas - despesasCaixa,
    };
  }
}
