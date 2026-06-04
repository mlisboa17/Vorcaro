import type { PrismaClient } from "@prisma/client";
import type { VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import { FinancialMemoryQueryService } from "../services/financial-memory-query.service";

export class FinancialAchievementTool {
  private readonly query: FinancialMemoryQueryService;

  constructor(prisma: PrismaClient) {
    this.query = new FinancialMemoryQueryService(prisma);
  }

  async execute(userId: string): Promise<VorcaroToolResult> {
    const items = await this.query.getAchievements(userId);
    return {
      intent: "ACHIEVEMENTS",
      title: "Conquistas financeiras",
      summary:
        items.length > 0
          ? `${items.length} conquista(s) desbloqueada(s).`
          : "Nenhuma conquista registrada ainda.",
      facts: items.slice(0, 6).map((a) => `${a.title}: ${a.description}`),
      metrics: { count: items.length },
      recommendations:
        items.length === 0 ? ["Mantenha metas e controle de gastos para desbloquear marcos."] : [],
    };
  }
}
