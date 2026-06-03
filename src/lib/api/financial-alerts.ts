import { prisma } from "@/lib/prisma";
import { FinancialAlertEngineService } from "@/modules/financial-alerts/application/services/financial-alert-engine.service";
import { PrismaFinancialAlertRepository } from "@/modules/financial-alerts/infrastructure/repositories/prisma-financial-alert.repository";

export function buildFinancialAlertRepository() {
  return new PrismaFinancialAlertRepository(prisma);
}

export function buildFinancialAlertEngine() {
  return new FinancialAlertEngineService(prisma);
}
