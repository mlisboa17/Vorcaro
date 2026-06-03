import { z } from "zod";

export const installmentGroupStatusSchema = z.enum(["ATIVO", "CONCLUIDO"]);
export const installmentParcelStatusSchema = z.enum(["PAID", "OPEN", "OVERDUE"]);

export const installmentGroupDtoSchema = z.object({
  installmentGroup: z.string(),
  descricao: z.string(),
  totalParcelas: z.number().int().nonnegative(),
  parcelaAtual: z.number().int().positive().nullable(),
  valorParcela: z.number(),
  valorTotal: z.number(),
  parcelasPagas: z.number().int().nonnegative(),
  parcelasRestantes: z.number().int().nonnegative(),
  valorPago: z.number(),
  valorRestante: z.number(),
  primeiraParcela: z.string(),
  ultimaParcela: z.string(),
  categoria: z.string().nullable().optional(),
  cartao: z.string().nullable().optional(),
  status: installmentGroupStatusSchema,
});

export const installmentGroupListSchema = z.array(installmentGroupDtoSchema);

export const installmentGroupTransactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  dataCaixa: z.string().nullable(),
  dataVencimentoFatura: z.string().nullable(),
  dataVencimento: z.string(),
  numeroParcela: z.number().int().positive().nullable(),
  totalParcelas: z.number().int().positive().nullable(),
  category: z.string().nullable(),
  card: z.string().nullable(),
  status: installmentParcelStatusSchema,
});

export const installmentGroupDetailSchema = z.object({
  installmentGroup: z.string(),
  descricao: z.string(),
  valorTotal: z.number(),
  valorPago: z.number(),
  valorRestante: z.number(),
  totalParcelas: z.number().int().nonnegative(),
  parcelasPagas: z.number().int().nonnegative(),
  parcelasRestantes: z.number().int().nonnegative(),
  status: installmentGroupStatusSchema,
  categoria: z.string().nullable().optional(),
  cartao: z.string().nullable().optional(),
  transactions: z.array(installmentGroupTransactionSchema),
});

export const installmentExecutiveSnapshotSchema = z.object({
  valorRestante: z.number(),
  planosAtivos: z.number().int().nonnegative(),
  parcelasAVencer30Dias: z.number().int().nonnegative(),
  cartaoMaiorConcentracao: z
    .object({
      nome: z.string(),
      valorRestante: z.number(),
      percentualDoTotal: z.number(),
    })
    .nullable(),
});
