import { z } from "zod";
import { transactionAllocationSchema } from "@/lib/api/transaction-body-schema";

export const createRecurringSchema = z
  .object({
    descricao: z.string().min(1).max(200),
    tipo: z.enum(["RECEITA", "DESPESA"]),
    valor: z.number().positive(),
    frequencia: z.enum([
      "SEMANAL",
      "QUINZENAL",
      "MENSAL",
      "BIMESTRAL",
      "TRIMESTRAL",
      "SEMESTRAL",
      "ANUAL",
    ]),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    categoriaId: z.string().min(1),
    contaFinanceiraId: z.string().min(1),
    formaPagamentoId: z.string().min(1),
    cartaoId: z.string().min(1).optional(),
    liabilityId: z.string().min(1).optional(),
    defaultAllocations: z.array(transactionAllocationSchema).optional(),
    observacoes: z.string().max(500).optional(),
  })
  .strict();

export const updateRecurringSchema = z
  .object({
    descricao: z.string().min(1).max(200).optional(),
    tipo: z.enum(["RECEITA", "DESPESA"]).optional(),
    valor: z.number().positive().optional(),
    frequencia: z
      .enum(["SEMANAL", "QUINZENAL", "MENSAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"])
      .optional(),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    proximaExecucao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    categoriaId: z.string().min(1).optional(),
    contaFinanceiraId: z.string().min(1).optional(),
    formaPagamentoId: z.string().min(1).optional(),
    cartaoId: z.string().min(1).nullable().optional(),
    liabilityId: z.string().min(1).nullable().optional(),
    defaultAllocations: z.array(transactionAllocationSchema).nullable().optional(),
    observacoes: z.string().max(500).nullable().optional(),
  })
  .strict();
