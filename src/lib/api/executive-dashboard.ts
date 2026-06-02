import { prisma } from "@/lib/prisma";
import { buildBudgetOverviewService } from "@/modules/budget/application/services/budget-overview.service";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import { ConsortiumService } from "@/modules/consortium/application/consortium.service";
import { ExecutiveDashboardService } from "@/modules/executive-dashboard/application/services/executive-dashboard.service";
import { MonthFinancialOverviewService } from "@/modules/executive-dashboard/application/services/month-financial-overview.service";
import { PrismaPatrimonyUnitOfWork } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony-unit-of-work";

export function buildExecutiveDashboardService(): ExecutiveDashboardService {
  const unitOfWork = new PrismaPatrimonyUnitOfWork(prisma);

  return new ExecutiveDashboardService(
    buildCashflowProjectionService(prisma),
    unitOfWork,
    buildBudgetOverviewService(prisma),
    new MonthFinancialOverviewService(prisma),
    new ConsortiumService(prisma),
  );
}
