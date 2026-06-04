import type { PrismaClient } from "@prisma/client";
import type { EvolutionHealthScoreResult } from "../../domain/types/financial-memory";
import { FinancialComparisonService } from "./financial-comparison.service";

export class EvolutionHealthScoreService {
  private readonly comparison: FinancialComparisonService;

  constructor(prisma: PrismaClient) {
    this.comparison = new FinancialComparisonService(prisma);
  }

  async compute(userId: string): Promise<EvolutionHealthScoreResult> {
    const cmp = await this.comparison.compare(userId, 30);
    const current = cmp.current?.healthScore ?? 0;
    const previous = cmp.past?.healthScore ?? null;
    const delta = previous != null ? current - previous : null;

    let label = `Score: ${current}`;
    if (previous != null && delta != null) {
      label = `Score: ${previous} → ${current}`;
      if (delta > 0) label += ` (+${delta})`;
      else if (delta < 0) label += ` (${delta})`;
    }

    return {
      current,
      previous,
      delta,
      label,
      hasSufficientHistory: cmp.hasSufficientHistory,
    };
  }
}
