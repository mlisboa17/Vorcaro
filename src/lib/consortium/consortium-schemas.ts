import { z } from "zod";

export const consortiumTypeSchema = z.enum(["VEHICLE", "REAL_ESTATE", "SERVICE", "OTHER"]);
export const consortiumStatusSchema = z.enum([
  "NOT_CONTEMPLATED",
  "CONTEMPLATED",
  "ASSET_ACQUIRED",
  "COMPLETED",
]);

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createConsortiumSchema = z
  .object({
    nome: z.string().min(1).max(200),
    tipo: consortiumTypeSchema,
    status: consortiumStatusSchema.default("NOT_CONTEMPLATED"),
    valorCredito: z.number().positive(),
    valorLance: z.number().min(0).optional(),
    valorPago: z.number().min(0).optional(),
    valorTaxas: z.number().min(0).optional(),
    quantidadeParcelas: z.number().int().min(1),
    parcelasPagas: z.number().int().min(0).optional(),
    dataContratacao: dateOnlySchema.optional(),
    dataContemplacao: dateOnlySchema.optional(),
    dataQuitacao: dateOnlySchema.optional(),
    assetId: z.string().min(1).optional().nullable(),
    lancamentoRecorrenteId: z.string().min(1).optional().nullable(),
  })
  .strict();

export const updateConsortiumSchema = z
  .object({
    nome: z.string().min(1).max(200).optional(),
    tipo: consortiumTypeSchema.optional(),
    status: consortiumStatusSchema.optional(),
    valorCredito: z.number().positive().optional(),
    valorLance: z.number().min(0).optional(),
    valorPago: z.number().min(0).optional(),
    valorTaxas: z.number().min(0).optional(),
    quantidadeParcelas: z.number().int().min(1).optional(),
    parcelasPagas: z.number().int().min(0).optional(),
    dataContratacao: dateOnlySchema.optional().nullable(),
    dataContemplacao: dateOnlySchema.optional().nullable(),
    dataQuitacao: dateOnlySchema.optional().nullable(),
    assetId: z.string().min(1).optional().nullable(),
    lancamentoRecorrenteId: z.string().min(1).optional().nullable(),
    registrarPagamentoParcela: z.boolean().optional(),
  })
  .strict();

export type CreateConsortiumInput = z.infer<typeof createConsortiumSchema>;
export type UpdateConsortiumInput = z.infer<typeof updateConsortiumSchema>;
