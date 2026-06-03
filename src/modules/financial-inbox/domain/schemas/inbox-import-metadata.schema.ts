import { z } from "zod";

/**
 * Metadados preparatórios para importação OFX / conciliação bancária futura.
 * Persistidos em FinancialInbox.metadata (separado de channelMeta multimodal).
 */
export const inboxImportMetadataSchema = z
  .object({
    contaFinanceiraId: z.string().min(1).optional(),
    cartaoId: z.string().min(1).optional(),
    externalId: z.string().min(1).optional(),
    importHash: z.string().min(1).optional(),
  })
  .strict();

export type InboxImportMetadata = z.infer<typeof inboxImportMetadataSchema>;

/** Metadados completos de linha importada (fatura/extrato). */
export const inboxImportLineMetadataSchema = z
  .object({
    bulkImport: z.boolean().optional(),
    importType: z.string().optional(),
    sourceFileName: z.string().optional(),
    cardDetectionStatus: z.string().optional(),
    contaFinanceiraId: z.string().min(1).optional(),
    cartaoId: z.string().min(1).optional(),
    externalId: z.string().min(1).optional(),
    importHash: z.string().min(1).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataCompra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataCaixa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataVencimentoFatura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    descricaoBase: z.string().optional(),
    installment: z.number().int().min(1).optional(),
    totalInstallments: z.number().int().min(1).optional(),
    installmentGroup: z.string().min(1).optional(),
    suggestedCategoryId: z.string().min(1).optional(),
    suggestedCategoryName: z.string().optional(),
    categoryConfidence: z.string().optional(),
  })
  .passthrough();

export type InboxImportLineMetadata = z.infer<typeof inboxImportLineMetadataSchema>;

export function parseInboxImportMetadata(value: unknown): InboxImportMetadata | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = inboxImportMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseInboxImportLineMetadata(value: unknown): InboxImportLineMetadata | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = inboxImportLineMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateInboxImportMetadata(value: unknown): InboxImportMetadata {
  return inboxImportMetadataSchema.parse(value);
}
