import type { PrismaClient } from "@prisma/client";
import type { VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import { FinancialMemoryQueryService } from "../services/financial-memory-query.service";

export class FinancialEvolutionTool {
  private readonly query: FinancialMemoryQueryService;

  constructor(prisma: PrismaClient) {
    this.query = new FinancialMemoryQueryService(prisma);
  }

  async execute(userId: string): Promise<VorcaroToolResult> {
    const data = await this.query.getEvolution(userId);
    if (!data.hasSufficientHistory) {
      return {
        intent: "EVOLUTION",
        title: "Evolução financeira",
        summary: this.query.insufficientHistoryMessage,
        facts: [],
        metrics: { historyDays: data.profile?.historyDaysAvailable ?? 0 },
        recommendations: [],
      };
    }
    const cmp30 = data.comparisons.find((c) => c.periodDays === 30);
    const cmp90 = data.comparisons.find((c) => c.periodDays === 90);
    return {
      intent: "EVOLUTION",
      title: "Evolução financeira",
      summary: data.healthScore.label,
      facts: [
        `Saúde: ${data.profile.healthTrend} · Patrimônio (90d): ${data.profile.netWorthTrend}`,
        `Caixa: ${data.profile.cashflowTrend} · Gastos: ${data.profile.spendingTrend}`,
        cmp30?.deltas.netWorthPercent != null
          ? `Patrimônio 30d: ${cmp30.deltas.netWorthPercent >= 0 ? "+" : ""}${cmp30.deltas.netWorthPercent.toFixed(1)}%`
          : "Patrimônio 30d: dados parciais.",
        cmp90?.deltas.healthScore != null
          ? `Score 90d: ${cmp90.deltas.healthScore >= 0 ? "+" : ""}${cmp90.deltas.healthScore} pts`
          : "",
      ].filter(Boolean),
      metrics: {
        healthScore: data.healthScore.current,
        healthDelta: data.healthScore.delta,
        historyDays: data.profile.historyDaysAvailable,
      },
      recommendations: ["Compare 180 e 365 dias no dashboard de memória financeira."],
    };
  }
}
