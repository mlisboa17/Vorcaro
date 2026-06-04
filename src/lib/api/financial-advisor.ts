import { prisma } from "@/lib/prisma";
import { FinancialAdvisorService } from "@/modules/financial-advisor/application/services/financial-advisor.service";
import { FinancialInsightsService } from "@/modules/financial-advisor/application/services/financial-insights.service";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";

export function buildFinancialAdvisorService() {
  return new FinancialAdvisorService(prisma);
}

export function buildFinancialInsightsService() {
  return new FinancialInsightsService(prisma);
}

export function buildIntelligentAdvisorService() {
  return new IntelligentAdvisorService(prisma);
}
