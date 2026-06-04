import type { PrismaClient } from "@prisma/client";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import type { AdvisorInsight } from "@/types/financial-advisor";
import type { AdvisorConsultationResponse } from "@/types/advisor-consultant";

export class FinancialInsightsService {
  private readonly consultant: IntelligentAdvisorService;

  constructor(prisma: PrismaClient) {
    this.consultant = new IntelligentAdvisorService(prisma);
  }

  async generate(
    userId: string,
  ): Promise<AdvisorConsultationResponse & { insights: AdvisorInsight[] }> {
    const consultation = await this.consultant.consult(userId);

    const insights: AdvisorInsight[] = consultation.risks.map((risk) => ({
      id: risk.id,
      ruleId: risk.source,
      title: risk.title,
      severity: risk.severity,
      description: risk.description,
    }));

    for (const action of consultation.actions.slice(0, 5)) {
      if (insights.length >= 12) break;
      insights.push({
        id: `action-${action.id}`,
        ruleId: action.type,
        title: action.title,
        severity:
          action.priority === "CRITICAL"
            ? "critical"
            : action.priority === "HIGH"
              ? "warning"
              : "info",
        description: action.description,
      });
    }

    return {
      ...consultation,
      insights,
    };
  }
}
