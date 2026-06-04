import { z } from "zod";
import { ADVISOR_ACTION_TYPES } from "@/modules/financial-consultant/domain/types/advisor-action";

export const advisorActionPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const advisorEffortSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const advisorEffortWeightSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const objectiveMetricSchema = z.object({
  currentValue: z.number(),
  comparisonValue: z.number().optional(),
  comparisonType: z.enum([
    "INCOME_PERCENTAGE",
    "MONTHLY_AVERAGE",
    "PREVIOUS_MONTH",
    "THREE_MONTH_TREND",
    "DUPLICATE_COUNT",
    "THRESHOLD",
  ]),
  percentage: z.number().optional(),
  threshold: z.number().optional(),
  trendDeltaPercent: z.number().optional(),
  explanation: z.string(),
});

export const advisorActionSchema = z.object({
  id: z.string(),
  type: z.enum(ADVISOR_ACTION_TYPES),
  title: z.string(),
  description: z.string(),
  priority: advisorActionPrioritySchema,
  effort: advisorEffortSchema,
  effortWeight: advisorEffortWeightSchema,
  recommendationHash: z.string(),
  actionUrl: z.string(),
  target: z.string().optional(),
  estimatedImpact: z.number(),
  objectiveMetric: objectiveMetricSchema,
  metadata: z.record(z.unknown()),
});

export const advisorRiskSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  description: z.string(),
  source: z.string(),
});

export const financialHealthScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  classification: z.enum(["EXCELENTE", "SAUDAVEL", "ATENCAO", "CRITICA"]),
  factors: z.array(z.object({ label: z.string(), impact: z.number() })),
});

export const savingsOpportunitySchema = z.object({
  rank: z.number().int(),
  title: z.string(),
  description: z.string(),
  estimatedMonthlySavings: z.number(),
  effort: advisorEffortSchema,
  effortWeight: advisorEffortWeightSchema,
  priorityScore: z.number(),
  actionType: z.enum(ADVISOR_ACTION_TYPES).optional(),
  actionId: z.string().optional(),
});

export const advisorConsultationResponseSchema = z.object({
  summary: z.string(),
  risks: z.array(advisorRiskSchema),
  recommendations: z.array(z.string()),
  actions: z.array(advisorActionSchema),
  healthScore: financialHealthScoreSchema,
  savingsOpportunities: z.array(savingsOpportunitySchema),
  subscriptionDuplicates: z.array(
    z.object({
      brand: z.string(),
      normalizedName: z.string(),
      duplicateGroup: z.string(),
      suspectedIds: z.array(z.string()),
      potentialMonthlySaving: z.number(),
      occurrences: z.number(),
      monthlyTotal: z.number(),
      descriptions: z.array(z.string()),
      cardIds: z.array(z.string()),
      accountIds: z.array(z.string()),
    }),
  ),
  moneyLeaks: z.array(
    z.object({
      label: z.string(),
      monthlyTotal: z.number(),
      itemCount: z.number(),
      occurrences: z.number(),
      trend: z.enum(["STABLE", "UP", "DOWN"]),
      trendDeltaPercent: z.number().optional(),
      suggestedPriority: advisorActionPrioritySchema,
      itemIds: z.array(z.string()),
      monthlyHistory: z.array(z.number()),
    }),
  ),
  spendingHealth: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      monthlyAmount: z.number(),
      percentOfIncome: z.number(),
      trend: z.enum(["UP", "DOWN", "STABLE"]),
    }),
  ),
  generatedAt: z.string(),
});

export type AdvisorConsultationResponse = z.infer<typeof advisorConsultationResponseSchema>;

export const HEALTH_SCORE_LABELS: Record<
  AdvisorConsultationResponse["healthScore"]["classification"],
  string
> = {
  EXCELENTE: "Excelente",
  SAUDAVEL: "Saudável",
  ATENCAO: "Atenção",
  CRITICA: "Crítica",
};
