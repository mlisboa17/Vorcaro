import type { PrismaClient } from "@prisma/client";
import { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import { AiRouterExhaustedError } from "@/modules/ai/domain/errors/ai-provider.error";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { AdvisorActionGuardrailService } from "@/modules/financial-consultant/application/services/advisor-action-guardrail.service";
import { AdvisorLanguageGuardrailService } from "@/modules/financial-consultant/application/services/advisor-language-guardrail.service";
import type { AdvisorAskResponse, AdvisorConfidence } from "@/types/financial-advisor";
import { VorcaroMessagingService } from "@/modules/vorcaro/application/services/vorcaro-messaging.service";
import { deriveVorcaroCriticalFromConsultation } from "@/modules/vorcaro/domain/derive-vorcaro-critical-context";
import { INSUFFICIENT_DATA_MESSAGE } from "../../domain/constants";
import { FinancialDataAggregatorService } from "./financial-data-aggregator.service";

function resolveConfidence(dataScore: number, usedSources: string[]): AdvisorConfidence {
  if (dataScore < 3 || usedSources.length === 0) return "LOW";
  if (dataScore < 7 || usedSources.length < 3) return "MEDIUM";
  return "HIGH";
}

export class FinancialAdvisorService {
  private readonly aggregator: FinancialDataAggregatorService;
  private readonly consultant: IntelligentAdvisorService;
  private readonly aiRouter: AiRouterService;
  private readonly guardrail = new AdvisorActionGuardrailService();
  private readonly languageGuardrail = new AdvisorLanguageGuardrailService();
  private readonly vorcaro: VorcaroMessagingService;

  constructor(
    prisma: PrismaClient,
    aiRouter?: AiRouterService,
  ) {
    this.aggregator = new FinancialDataAggregatorService(prisma);
    this.consultant = new IntelligentAdvisorService(prisma);
    this.aiRouter = aiRouter ?? new AiRouterService();
    this.vorcaro = new VorcaroMessagingService(prisma);
  }

  async ask(userId: string, question: string): Promise<AdvisorAskResponse> {
    const [context, consultation] = await Promise.all([
      this.aggregator.aggregate(userId),
      this.consultant.consult(userId),
    ]);
    const confidence = resolveConfidence(context.dataScore, context.usedSources);

    if (confidence === "LOW") {
      return {
        answer: INSUFFICIENT_DATA_MESSAGE,
        provider: "groq",
        model: "n/a",
        confidence: "LOW",
        usedSources: context.usedSources,
      };
    }

    const safeActions = this.guardrail.validateActions(consultation.actions);

    const actionsBlock = safeActions
      .slice(0, 15)
      .map(
        (a) =>
          `- [id:${a.id}] [${a.priority}] ${a.title} (${a.type}, esforço ${a.effort}) → ${a.actionUrl || "n/a"} · ${a.objectiveMetric.explanation}${a.estimatedImpact > 0 ? ` · impacto ~R$ ${a.estimatedImpact.toFixed(2)}` : ""}`,
      )
      .join("\n");

    const prompt = `${context.markdown}

## Consultor financeiro (dados determinísticos)
Resumo: ${consultation.summary}
Score de saúde: ${consultation.healthScore.score}/100 (${consultation.healthScore.classification})
Top economias: ${consultation.savingsOpportunities.map((s) => s.title).join("; ") || "nenhuma"}

### Ações estruturadas do sistema (use APENAS estas)
${actionsBlock || "- Nenhuma ação pendente"}

---

Pergunta do usuário:
${question}`;

    try {
      const criticalContext = deriveVorcaroCriticalFromConsultation(consultation);
      const category = this.vorcaro.inferCategoryFromCriticalContext(criticalContext);
      const llmContext = await this.vorcaro.buildLlmPromptContext({
        userId,
        category,
        criticalContext,
      });

      const result = await this.aiRouter.generateText({
        system: llmContext.system,
        prompt,
        temperature: 0.2,
        maxTokens: 1500,
      });

      let answer = result.text.includes(INSUFFICIENT_DATA_MESSAGE)
        ? INSUFFICIENT_DATA_MESSAGE
        : result.text;

      answer = this.guardrail.sanitizeLlmAnswer(answer, safeActions);
      answer = this.languageGuardrail.enrichAnswerWithObjectiveMetrics(answer, safeActions);

      return {
        answer,
        provider: result.provider,
        model: result.model,
        confidence,
        usedSources: context.usedSources,
      };
    } catch (error) {
      if (error instanceof AiRouterExhaustedError) {
        return {
          answer: "Os provedores de IA estão indisponíveis no momento. Tente novamente em instantes.",
          provider: "groq",
          model: "n/a",
          confidence: "LOW",
          usedSources: context.usedSources,
        };
      }
      throw error;
    }
  }
}
