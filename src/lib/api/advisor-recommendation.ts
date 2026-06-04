import { prisma } from "@/lib/prisma";
import { AdvisorRecommendationMemoryService } from "@/modules/financial-consultant/application/services/advisor-recommendation-memory.service";

export function buildAdvisorRecommendationMemoryService() {
  return new AdvisorRecommendationMemoryService(prisma);
}
