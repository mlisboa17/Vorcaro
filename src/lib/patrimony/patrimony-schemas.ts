import { AssetType, LiabilityType } from "@prisma/client";
import { z } from "zod";

const assetTypeSchema = z.nativeEnum(AssetType);
const liabilityTypeSchema = z.nativeEnum(LiabilityType);
const decimalLikeSchema = z.union([z.number(), z.string().min(1)]).transform((value) => Number(value));
const decimalPositiveSchema = decimalLikeSchema.refine((value) => Number.isFinite(value) && value > 0, {
  message: "Valor deve ser positivo",
});
const decimalNonNegativeSchema = decimalLikeSchema.refine(
  (value) => Number.isFinite(value) && value >= 0,
  { message: "Valor deve ser maior ou igual a zero" },
);
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createAssetSchema = z
  .object({
    nome: z.string().min(1).max(200),
    descricao: z.string().max(500).optional(),
    tipo: assetTypeSchema,
    valorAquisicao: decimalPositiveSchema,
    valorAtual: decimalNonNegativeSchema.optional(),
    dataAquisicao: dateOnlySchema.optional(),
    observacoes: z.string().max(1000).optional(),
    liabilityId: z.string().min(1).optional(),
  })
  .strict();

export const updateAssetSchema = z
  .object({
    nome: z.string().min(1).max(200).optional(),
    descricao: z.string().max(500).nullable().optional(),
    tipo: assetTypeSchema.optional(),
    valorAquisicao: decimalPositiveSchema.optional(),
    valorAtual: decimalNonNegativeSchema.optional(),
    dataAquisicao: dateOnlySchema.nullable().optional(),
    estaAtiva: z.boolean().optional(),
    observacoes: z.string().max(1000).nullable().optional(),
    liabilityId: z.string().min(1).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "Informe ao menos um campo." });

export const createLiabilitySchema = z
  .object({
    nome: z.string().min(1).max(200),
    descricao: z.string().max(500).optional(),
    tipo: liabilityTypeSchema,
    saldoOriginal: decimalPositiveSchema,
    saldoAtual: decimalNonNegativeSchema.optional(),
    taxaJuros: decimalNonNegativeSchema.optional(),
    dataContratacao: dateOnlySchema.optional(),
    dataQuitacaoPrevista: dateOnlySchema.optional(),
    observacoes: z.string().max(1000).optional(),
  })
  .strict();

export const updateLiabilitySchema = z
  .object({
    nome: z.string().min(1).max(200).optional(),
    descricao: z.string().max(500).nullable().optional(),
    tipo: liabilityTypeSchema.optional(),
    saldoOriginal: decimalPositiveSchema.optional(),
    saldoAtual: decimalNonNegativeSchema.optional(),
    taxaJuros: decimalNonNegativeSchema.optional(),
    dataContratacao: dateOnlySchema.optional(),
    dataQuitacaoPrevista: dateOnlySchema.optional(),
    estaAtiva: z.boolean().optional(),
    observacoes: z.string().max(1000).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "Informe ao menos um campo." });

export const investmentTxSchema = z
  .object({
    assetId: z.string().min(1),
    tipo: z.enum(["APORTE", "RESGATE", "RENDIMENTO"]),
    valorTotal: z.number().positive(),
    data: z.string().min(1),
    descricao: z.string().max(500).optional(),
    mainTransactionId: z.string().min(1).optional(),
  })
  .strict();

export const financingPaymentSchema = z
  .object({
    liabilityId: z.string().min(1),
    data: z.string().min(1),
    descricao: z.string().max(500).optional(),
    amortizacao: z.number().nonnegative(),
    juros: z.number().nonnegative(),
    seguro: z.number().nonnegative(),
    taxa: z.number().nonnegative(),
    mainTransactionId: z.string().min(1).optional(),
  })
  .strict()
  .refine((data) => data.amortizacao + data.juros + data.seguro + data.taxa > 0, {
    message: "Informe ao menos um componente da parcela.",
  });

export const consortiumParcelSchema = z
  .object({
    assetId: z.string().min(1),
    data: z.string().min(1),
    descricao: z.string().max(500).optional(),
    fundoComum: z.number().nonnegative(),
    taxaAdministracao: z.number().nonnegative(),
    fundoReserva: z.number().nonnegative().optional(),
    mainTransactionId: z.string().min(1).optional(),
  })
  .strict()
  .refine((data) => data.fundoComum + data.taxaAdministracao + (data.fundoReserva ?? 0) > 0, {
    message: "Informe valores da parcela.",
  });

export const assetValuationSchema = z
  .object({
    assetId: z.string().min(1),
    tipo: z.enum(["CORRECAO", "DEPRECIACAO"]),
    valorAjuste: z.number(),
    data: z.string().min(1),
    descricao: z.string().max(500).optional(),
  })
  .strict();

export const consortiumContemplationSchema = z
  .object({
    consortiumAssetId: z.string().min(1),
    targetAsset: z.object({
      nome: z.string().min(1).max(200),
      tipo: z.enum(["VEHICLE", "REAL_ESTATE", "OTHER", "BEM"]),
      descricao: z.string().max(500).optional(),
      dataAquisicao: z.string().min(1),
    }),
    saldoDevedorRemanescente: z.number().nonnegative().optional(),
    liabilityNome: z.string().max(200).optional(),
    data: z.string().min(1),
    descricao: z.string().max(500).optional(),
  })
  .strict();
