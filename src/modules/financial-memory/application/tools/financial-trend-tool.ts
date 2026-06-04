import type { PrismaClient } from "@prisma/client";
import type { VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import { FinancialMemoryQueryService } from "../services/financial-memory-query.service";

export class FinancialTrendTool {
  private readonly query: FinancialMemoryQueryService;

  constructor(prisma: PrismaClient) {
    this.query = new FinancialMemoryQueryService(prisma);
  }

  async execute(userId: string): Promise<VorcaroToolResult> {
    const data = await this.query.getTrendsSummary(userId);
    if (!data.hasSufficientHistory) {
      return {
        intent: "TRENDS",
        title: "Tendências",
        summary: this.query.insufficientHistoryMessage,
        facts: [],
        metrics: {},
        recommendations: [],
      };
    }
    return {
      intent: "TRENDS",
      title: "Tendências financeiras",
      summary: data.summary,
      facts: data.profile
        ? [
            `Saúde: ${data.profile.healthTrend}`,
            `Patrimônio: ${data.profile.netWorthTrend}`,
            `Fluxo de caixa: ${data.profile.cashflowTrend}`,
            `Gastos: ${data.profile.spendingTrend}`,
            `Dívida: ${data.profile.debtTrend}`,
            `Metas: ${data.profile.goalTrend}`,
          ]
        : [],
      metrics: { historyDays: data.profile?.historyDaysAvailable ?? 0 },
      recommendations: ["Cruze tendências com eventos da linha do tempo."],
    };
  }
}
