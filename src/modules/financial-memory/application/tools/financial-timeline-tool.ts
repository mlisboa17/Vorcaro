import type { PrismaClient } from "@prisma/client";
import type { VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import { FinancialMemoryQueryService } from "../services/financial-memory-query.service";

export class FinancialTimelineTool {
  private readonly query: FinancialMemoryQueryService;

  constructor(prisma: PrismaClient) {
    this.query = new FinancialMemoryQueryService(prisma);
  }

  async execute(userId: string): Promise<VorcaroToolResult> {
    const data = await this.query.getTimeline(userId, 30);
    if (!data.hasSufficientHistory && data.events.length === 0) {
      return {
        intent: "TIMELINE",
        title: "Linha do tempo",
        summary: this.query.insufficientHistoryMessage,
        facts: [],
        metrics: { historyDays: data.historyDaysAvailable },
        recommendations: ["Continue registrando transações para habilitar a linha do tempo."],
      };
    }
    return {
      intent: "TIMELINE",
      title: "Linha do tempo financeira",
      summary: `${data.events.length} evento(s) em ${data.historyDaysAvailable} dias de histórico.`,
      facts: data.events.slice(0, 8).map((e) => `${e.eventDate.toISOString().slice(0, 10)} — ${e.title}`),
      metrics: { eventCount: data.events.length, historyDays: data.historyDaysAvailable },
      recommendations: ["Revise marcos no dashboard Memória Financeira."],
    };
  }
}
