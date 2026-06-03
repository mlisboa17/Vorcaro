import { prisma } from "@/lib/prisma";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";

export function buildFinancialPlanningService(): FinancialPlanningService {
  return new FinancialPlanningService(prisma);
}

/** Export isolado para Telegram / mensageria. */
export async function getFinancialGoalsForUser(userId: string) {
  return buildFinancialPlanningService().getGoals(userId);
}
