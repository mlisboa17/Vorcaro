import type { PrismaClient } from "@prisma/client";
import { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import { AiRouterExhaustedError } from "@/modules/ai/domain/errors/ai-provider.error";
import type { AdvisorAskResponse, AdvisorConfidence } from "@/types/financial-advisor";
import { ADVISOR_SYSTEM_PROMPT, INSUFFICIENT_DATA_MESSAGE } from "../../domain/constants";
import { FinancialDataAggregatorService } from "./financial-data-aggregator.service";

function resolveConfidence(dataScore: number, usedSources: string[]): AdvisorConfidence {
  if (dataScore < 3 || usedSources.length === 0) return "LOW";
  if (dataScore < 7 || usedSources.length < 3) return "MEDIUM";
  return "HIGH";
}

export class FinancialAdvisorService {
  private readonly aggregator: FinancialDataAggregatorService;
  private readonly aiRouter: AiRouterService;

  constructor(
    prisma: PrismaClient,
    aiRouter?: AiRouterService,
  ) {
    this.aggregator = new FinancialDataAggregatorService(prisma);
    this.aiRouter = aiRouter ?? new AiRouterService();
  }

  async ask(userId: string, question: string): Promise<AdvisorAskResponse> {
    const context = await this.aggregator.aggregate(userId);
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

    const prompt = `${context.markdown}\n\n---\n\nPergunta do usuário:\n${question}`;

    try {
      const result = await this.aiRouter.generateText({
        system: ADVISOR_SYSTEM_PROMPT,
        prompt,
        temperature: 0.2,
        maxTokens: 1500,
      });

      const answer = result.text.includes(INSUFFICIENT_DATA_MESSAGE)
        ? INSUFFICIENT_DATA_MESSAGE
        : result.text;

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
