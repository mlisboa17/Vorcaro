import { z } from "zod";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const inboxPendingCorrectionsSchema = z
  .object({
    dataCompra: dateOnlySchema.optional(),
    dataCaixa: dateOnlySchema.optional(),
    dataVencimentoFatura: dateOnlySchema.optional(),
    categoryId: z.string().min(1).optional(),
    accountId: z.string().min(1).optional(),
    paymentMethodId: z.string().min(1).optional(),
    cardId: z.string().min(1).nullable().optional(),
  })
  .strict();

export type InboxPendingCorrections = z.infer<typeof inboxPendingCorrectionsSchema>;
