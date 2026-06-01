import { z } from "zod";
import type { InboxPendingCorrections } from "./inbox-pending-corrections.schema";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const inboxBulkUpdatePatchSchema = z
  .object({
    dataCompra: dateOnlySchema.optional(),
    dataCaixa: dateOnlySchema.optional(),
    dataVencimentoFatura: dateOnlySchema.optional(),
    categoriaId: z.string().min(1).optional(),
    contaFinanceiraId: z.string().min(1).optional(),
    formaPagamentoId: z.string().min(1).optional(),
    cartaoId: z.string().min(1).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo para alterar");

export const inboxBulkUpdateApiSchema = z
  .object({
    inboxItemIds: z.array(z.string().min(1)).min(1),
    patch: inboxBulkUpdatePatchSchema,
  })
  .strict();

export type InboxBulkUpdatePatch = z.infer<typeof inboxBulkUpdatePatchSchema>;

export function mapBulkUpdatePatchToPendingCorrections(
  patch: InboxBulkUpdatePatch,
): InboxPendingCorrections {
  return {
    ...(patch.dataCompra ? { dataCompra: patch.dataCompra } : {}),
    ...(patch.dataCaixa ? { dataCaixa: patch.dataCaixa } : {}),
    ...(patch.dataVencimentoFatura
      ? { dataVencimentoFatura: patch.dataVencimentoFatura }
      : {}),
    ...(patch.categoriaId ? { categoryId: patch.categoriaId } : {}),
    ...(patch.contaFinanceiraId ? { accountId: patch.contaFinanceiraId } : {}),
    ...(patch.formaPagamentoId ? { paymentMethodId: patch.formaPagamentoId } : {}),
    ...(patch.cartaoId !== undefined ? { cardId: patch.cartaoId } : {}),
  };
}

export function mapPendingCorrectionsToBulkUpdatePatch(
  patch: InboxPendingCorrections,
): InboxBulkUpdatePatch {
  return {
    ...(patch.dataCompra ? { dataCompra: patch.dataCompra } : {}),
    ...(patch.dataCaixa ? { dataCaixa: patch.dataCaixa } : {}),
    ...(patch.dataVencimentoFatura
      ? { dataVencimentoFatura: patch.dataVencimentoFatura }
      : {}),
    ...(patch.categoryId ? { categoriaId: patch.categoryId } : {}),
    ...(patch.accountId ? { contaFinanceiraId: patch.accountId } : {}),
    ...(patch.paymentMethodId ? { formaPagamentoId: patch.paymentMethodId } : {}),
    ...(patch.cardId !== undefined ? { cartaoId: patch.cardId } : {}),
  };
}
