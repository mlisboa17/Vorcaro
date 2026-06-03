import { z } from "zod";
import { financialGoalCompleteSchema } from "@/types/financial-planning";
import { installmentExecutiveSnapshotSchema } from "@/types/installments";

export const executiveAlertSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const executiveDashboardAlertSchema = z.object({
  type: z.string().min(1),
  severity: executiveAlertSeveritySchema,
  message: z.string().min(1),
});

export const executiveDashboardCoreSchema = z.object({
  cash: z.object({
    saldoAtual: z.number(),
    saldoProjetado30Dias: z.number(),
    saldoProjetado90Dias: z.number(),
    primeiraDataNegativa: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  }),
  month: z.object({
    receitas: z.number(),
    despesasCaixa: z.number(),
    despesasDre: z.number(),
    saldoMes: z.number(),
  }),
  budget: z.object({
    totalPlanejado: z.number(),
    totalRealizadoDre: z.number(),
    restante: z.number(),
    categoriasEstouradas: z.number(),
    categoriasAtencao: z.number(),
  }),
  patrimony: z.object({
    totalAtivos: z.number(),
    totalPassivos: z.number(),
    patrimonioLiquido: z.number(),
  }),
  consortium: z.object({
    consorciosAtivos: z.number().int().min(0),
    creditoTotalConsorcio: z.number(),
    valorPagoConsorcio: z.number(),
  }),
  alerts: z.array(executiveDashboardAlertSchema),
});

export const executiveDashboardResponseSchema = executiveDashboardCoreSchema.extend({
  planning: z.object({
    metasAtivas: z.number().int(),
    percentualProgressoGlobal: z.number(),
    metaMaisProxima: financialGoalCompleteSchema.nullable(),
    metaMaisAtrasada: financialGoalCompleteSchema.nullable(),
    metaMaiorValor: financialGoalCompleteSchema.nullable(),
  }),
  installments: installmentExecutiveSnapshotSchema,
});

export type ExecutiveDashboardAlert = z.infer<typeof executiveDashboardAlertSchema>;
export type ExecutiveDashboardCoreDTO = z.infer<typeof executiveDashboardCoreSchema>;
export type ExecutiveDashboardDTO = z.infer<typeof executiveDashboardResponseSchema>;
