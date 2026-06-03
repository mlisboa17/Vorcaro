import { z } from "zod";

export const financialGoalTypeSchema = z.enum([
  "EMERGENCY_FUND",
  "VEHICLE",
  "REAL_ESTATE",
  "DEBT_SETTLEMENT",
  "EDUCATION",
  "RETIREMENT",
  "CUSTOM",
]);

export const goalPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const goalStatusSchema = z.enum(["ACTIVE", "ACHIEVED", "CANCELLED"]);
export const goalRiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const goalVisualStatusSchema = z.enum([
  "VIAVEL",
  "ATENCAO",
  "RISCO_ALTO",
  "ATRASADA",
]);

export const createFinancialGoalSchema = z
  .object({
    nome: z.string().min(1).max(120),
    descricao: z.string().max(500).optional(),
    tipo: financialGoalTypeSchema,
    valorObjetivo: z.string().regex(/^\d+(\.\d{1,2})?$/),
    valorAtual: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    aporteMensal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
    dataObjetivo: z.string().datetime().optional().nullable(),
    prioridade: goalPrioritySchema,
  })
  .strict();

export const updateFinancialGoalSchema = createFinancialGoalSchema.partial().extend({
  status: goalStatusSchema.optional(),
});

export const goalStrategyLayerSchema = z.object({
  mesesRestantes: z.number().int().nullable(),
  dataEstimada: z.string().nullable(),
  aporteNecessario: z.string().nullable(),
  percentualConcluido: z.number(),
});

export const goalViabilityLayerSchema = z.object({
  viavel: z.boolean(),
  risco: goalRiskLevelSchema,
  margemLivreMensal: z.string(),
  percentualComprometimento: z.number(),
  statusVisual: goalVisualStatusSchema,
  atrasada: z.boolean(),
});

export const goalRecommendationLayerSchema = z.object({
  titulo: z.string(),
  mensagem: z.string(),
  explicabilidade: z.array(z.string()),
  otimizacao: z
    .object({
      aporteExtraMensal: z.string(),
      mesesAntecipados: z.number().int(),
      mensagem: z.string(),
    })
    .optional(),
});

export const financialGoalCompleteSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string().nullable(),
  tipo: financialGoalTypeSchema,
  valorObjetivo: z.string(),
  valorAtual: z.string(),
  aporteMensal: z.string().nullable(),
  dataObjetivo: z.string().nullable(),
  prioridade: goalPrioritySchema,
  status: goalStatusSchema,
  ordemPrioridade: z.number().int(),
  estrategia: goalStrategyLayerSchema,
  viabilidade: goalViabilityLayerSchema,
  recomendacao: goalRecommendationLayerSchema,
});

export const planningSummarySchema = z.object({
  metasAtivas: z.number().int(),
  valorTotalPlanejado: z.string(),
  valorAcumulado: z.string(),
  taxaConclusaoGlobal: z.number(),
  percentualProgressoGlobal: z.number(),
  metaMaisProxima: financialGoalCompleteSchema.nullable(),
  metaMaisAtrasada: financialGoalCompleteSchema.nullable(),
  metaMaiorValor: financialGoalCompleteSchema.nullable(),
});

export const planningGoalsListSchema = z.object({
  goals: z.array(financialGoalCompleteSchema),
  summary: planningSummarySchema,
  recommendations: z.array(
    z.object({
      tipo: financialGoalTypeSchema,
      titulo: z.string(),
      mensagem: z.string(),
      prioridadeSugerida: goalPrioritySchema,
      valorSugerido: z.string().optional(),
    }),
  ),
});

export type GoalRiskLevel = z.infer<typeof goalRiskLevelSchema>;
export type GoalVisualStatus = z.infer<typeof goalVisualStatusSchema>;
export type GoalLayerRecommendation = z.infer<typeof goalRecommendationLayerSchema>;
export type FinancialGoalComplete = z.infer<typeof financialGoalCompleteSchema>;
export type PlanningSummary = z.infer<typeof planningSummarySchema>;

/** @deprecated Use FinancialGoalComplete */
export type FinancialGoalWithProjection = FinancialGoalComplete;
