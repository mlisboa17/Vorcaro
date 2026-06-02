import { z } from "zod";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const bulkTransactionUpdatesSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    subcategoryId: z.string().min(1).optional(),
    financialAccountId: z.string().min(1).optional(),
    paymentMethodId: z.string().min(1).optional(),
    cardId: z.string().min(1).nullable().optional(),
    liabilityId: z.string().min(1).nullable().optional(),
    date: dateOnlySchema.optional(),
    dataCaixa: dateOnlySchema.optional(),
    dataCompra: dateOnlySchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo para alterar");

export const bulkUpdateTransactionsApiSchema = z
  .object({
    transactionIds: z.array(z.string().min(1)).min(1).max(500),
    updates: bulkTransactionUpdatesSchema,
  })
  .strict();

export const bulkDeleteTransactionsApiSchema = z
  .object({
    transactionIds: z.array(z.string().min(1)).min(1).max(500),
  })
  .strict();

export type BulkTransactionUpdates = z.infer<typeof bulkTransactionUpdatesSchema>;

export const BULK_TRANSACTION_AUDIT_FIELD_MAP: Record<keyof BulkTransactionUpdates, string> = {
  categoryId: "categoria",
  subcategoryId: "subcategoria",
  financialAccountId: "contaFinanceira",
  paymentMethodId: "formaPagamento",
  cardId: "cartao",
  liabilityId: "passivo",
  date: "date",
  dataCaixa: "dataCaixa",
  dataCompra: "dataCompra",
};

export function resolveBulkCategoryId(updates: BulkTransactionUpdates): string | undefined {
  return updates.subcategoryId ?? updates.categoryId;
}

export function listBulkAuditFields(updates: BulkTransactionUpdates): string[] {
  const fields = new Set<string>();

  for (const key of Object.keys(updates) as (keyof BulkTransactionUpdates)[]) {
    fields.add(BULK_TRANSACTION_AUDIT_FIELD_MAP[key]);
  }

  if (updates.subcategoryId && updates.categoryId) {
    fields.add(BULK_TRANSACTION_AUDIT_FIELD_MAP.categoryId);
  }

  return [...fields];
}
