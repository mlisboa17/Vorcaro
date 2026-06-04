import { prisma } from "@/lib/prisma";
import { FinancialTimelineEngineService } from "@/modules/financial-memory/application/services/financial-timeline-engine.service";
import { PrismaFinancialMemoryRepository } from "@/modules/financial-memory/infrastructure/repositories/prisma-financial-memory.repository";

export function buildFinancialTimelineEngine() {
  return new FinancialTimelineEngineService(prisma);
}

export function buildFinancialMemoryRepository() {
  return new PrismaFinancialMemoryRepository(prisma);
}
