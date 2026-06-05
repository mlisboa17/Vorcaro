import type { PrismaClient } from "@prisma/client";
import { CategoryTaxonomyAuditService } from "@/modules/categories/application/services/category-taxonomy-audit.service";
import { VorcaroConsultativeResponseService } from "../services/vorcaro-consultative-response.service";
import type { ConsultativeMode } from "../services/vorcaro-consultative-response.service";
import type { VorcaroToolResult } from "../../domain/types/vorcaro-intent";

const MAX_PRIORITY_TOPICS = 5;

function detectConsultativeMode(question: string): ConsultativeMode | undefined {
  if (/resumo|executivo|rapidamente|em poucas palavras/i.test(question)) return "EXECUTIVE";
  if (/detalh|completo|todos os pontos|anal[ií]tico/i.test(question)) return "ANALYTICAL";
  return undefined;
}

export class CategoryAuditTool {
  private readonly auditService: CategoryTaxonomyAuditService;
  private readonly consultative = new VorcaroConsultativeResponseService();

  constructor(prisma: PrismaClient) {
    this.auditService = new CategoryTaxonomyAuditService(prisma);
  }

  async execute(
    userId: string,
    question: string,
    options: { priorUserMessages?: string[] } = {},
  ): Promise<VorcaroToolResult> {
    const report = await this.auditService.audit(userId);
    const mode = detectConsultativeMode(question);
    const response = this.consultative.format(report, {
      question,
      mode,
      userId,
      priorUserMessages: options.priorUserMessages,
    });

    const wantsDashboard =
      /visualizar|ver proposta|mostrar proposta|abrir|detalhes/i.test(question) &&
      !/melhorar|cadastro/i.test(question);

    const suggestedActions =
      wantsDashboard && report.findings.length > 0
        ? [
            {
              type: "OPEN_DASHBOARD_SECTION" as const,
              title: "Ver proposta detalhada",
              description: response.ctaDescription,
              payload: { section: "/dashboard/categories/audit" },
            },
          ]
        : undefined;

    return {
      intent: "CATEGORY_AUDIT",
      title: "Organização das categorias",
      summary: response.message,
      facts: response.recommendations.slice(0, MAX_PRIORITY_TOPICS).map((rec) => rec.whatIFound),
      metrics: {
        healthScore: report.healthScore.score,
        healthLabel: report.healthScore.label,
        topImprovements: report.topImprovements.length,
        totalFindings: report.summary.totalFindings,
        suggestedMerges: report.suggestedMerges.length,
        supplierLike: report.supplierLikeCategories.length,
        lowUsage: report.lowUsageCategories.length,
        consultativeMode: mode ?? "CONSULTATIVE",
      },
      recommendations: [
        response.healthScoreLine,
        "Nada será alterado automaticamente — qualquer mudança passa pela sua confirmação.",
      ],
      suggestedActions,
    };
  }
}
