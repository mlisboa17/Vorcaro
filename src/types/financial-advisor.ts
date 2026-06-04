import { z } from "zod";
import type { AiProviderName } from "@/modules/ai/domain/ports/ai-provider.port";
import { advisorConsultationResponseSchema } from "./advisor-consultant";

export type AdvisorConfidence = "LOW" | "MEDIUM" | "HIGH";

export const advisorAskBodySchema = z
  .object({
    question: z.string().min(3).max(2000),
  })
  .strict();

export const advisorAskResponseSchema = z.object({
  answer: z.string(),
  provider: z.enum(["groq", "gemini", "openrouter"]),
  model: z.string(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  usedSources: z.array(z.string()),
});

export type AdvisorAskResponse = z.infer<typeof advisorAskResponseSchema>;

export const advisorInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  description: z.string(),
  ruleId: z.string(),
  provider: z.enum(["groq", "gemini", "openrouter"]).optional(),
  model: z.string().optional(),
});

export const advisorInsightsResponseSchema = advisorConsultationResponseSchema.extend({
  insights: z.array(advisorInsightSchema),
});

export type AdvisorInsight = z.infer<typeof advisorInsightSchema>;

/** Reexport — consulta completa Sprint 9.5 */
export {
  advisorConsultationResponseSchema,
  type AdvisorConsultationResponse,
  HEALTH_SCORE_LABELS,
} from "./advisor-consultant";

export type { AiProviderName };
