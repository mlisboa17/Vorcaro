import { z } from "zod";

export const executiveAlertSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const executiveDashboardAlertSchema = z.object({
  type: z.string().min(1),
  severity: executiveAlertSeveritySchema,
  message: z.string().min(1),
});

export const executiveDashboardResponseSchema = z.object({
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

export type ExecutiveDashboardAlert = z.infer<typeof executiveDashboardAlertSchema>;
export type ExecutiveDashboardDTO = z.infer<typeof executiveDashboardResponseSchema>;
