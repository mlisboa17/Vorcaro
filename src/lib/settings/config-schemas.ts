import { CardBrand, CardType } from "@prisma/client";
import { z } from "zod";

export const updateCategorySchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    estaAtiva: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.nome !== undefined || data.estaAtiva !== undefined, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const updateAccountSchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    nomeInstituicao: z.string().max(120).nullable().optional(),
    tipo: z
      .enum([
        "CORRENTE",
        "POUPANCA",
        "INVESTIMENTO",
        "CARTEIRA_DIGITAL",
        "CARTEIRA_DINHEIRO",
        "PJ",
      ])
      .optional(),
    moeda: z.string().length(3).optional(),
    saldo: z.number().optional(),
    estaAtiva: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const updateCardSchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    contaFinanceiraId: z.string().min(1).nullable().optional(),
    nomeInstituicao: z.string().max(120).nullable().optional(),
    bandeira: z.nativeEnum(CardBrand).optional(),
    tipo: z.nativeEnum(CardType).optional(),
    ultimosQuatroDigitos: z.string().regex(/^\d{4}$/).nullable().optional(),
    limiteCredito: z.number().positive().nullable().optional(),
    diaFechamento: z.number().int().min(1).max(31).nullable().optional(),
    diaVencimento: z.number().int().min(1).max(31).nullable().optional(),
    estaAtivo: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const updatePaymentMethodSchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    tipo: z
      .enum(["PIX", "DINHEIRO", "BOLETO", "TRANSFERENCIA", "CARTAO", "DEBITO_AUTOMATICO"])
      .optional(),
    padrao: z.boolean().optional(),
    estaAtiva: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export type DeleteMode = "soft" | "hard";

export interface SmartDeleteResult {
  mode: DeleteMode;
}
