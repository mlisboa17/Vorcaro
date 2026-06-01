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

export function parseInboxImportMetadata(value: unknown): InboxImportMetadata | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = inboxImportMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateInboxImportMetadata(value: unknown): InboxImportMetadata {
  return inboxImportMetadataSchema.parse(value);
}
