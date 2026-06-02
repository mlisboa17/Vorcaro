import { z } from "zod";

export const importFinancialFileTypeSchema = z.enum(["EXTRATO_BANCARIO", "FATURA_CARTAO"]);

export const categoryConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const importPreviewLineSchema = z
  .object({
    lineIndex: z.number().int().min(0),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    rawContent: z.string().min(1),
    externalId: z.string().min(1).optional(),
    importHash: z.string().min(1),
    isDuplicate: z.boolean(),
    installment: z.number().int().min(1).optional(),
    totalInstallments: z.number().int().min(1).optional(),
    suggestedCategoryId: z.string().min(1).nullable().optional(),
    suggestedCategoryName: z.string().nullable().optional(),
    categoryConfidence: categoryConfidenceSchema.optional(),
    dataCompra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataCaixa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataVencimentoFatura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

export const importPreviewResponseSchema = z
  .object({
    sourceFileName: z.string().min(1),
    importType: importFinancialFileTypeSchema,
    totals: z.object({
      total: z.number().int().min(0),
      newCount: z.number().int().min(0),
      duplicateCount: z.number().int().min(0),
    }),
    detectedCard: z
      .object({
        cardId: z.string().min(1).nullable(),
        exists: z.boolean(),
        bank: z.string().nullable(),
        brand: z.string().nullable(),
        lastFourDigits: z.string().nullable(),
        cardName: z.string().nullable(),
        displayName: z.string().nullable(),
      })
      .nullable()
      .optional(),
    invoiceDates: z
      .object({
        dataCaixa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        dataVencimentoFatura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .optional(),
    previewSample: z.array(importPreviewLineSchema),
    lines: z.array(importPreviewLineSchema),
  })
  .strict();

export const importConfirmLineSchema = importPreviewLineSchema.omit({
  isDuplicate: true,
});

export const importConfirmRequestSchema = z
  .object({
    importType: importFinancialFileTypeSchema,
    sourceFileName: z.string().min(1),
    contaFinanceiraId: z.string().min(1).optional(),
    cartaoId: z.string().min(1).optional(),
    skipDuplicates: z.boolean().default(true),
    dataCaixa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataVencimentoFatura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cardDetectionStatus: z.string().optional(),
    lines: z.array(importConfirmLineSchema).min(1).max(5000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.importType === "EXTRATO_BANCARIO" && !value.contaFinanceiraId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contaFinanceiraId é obrigatório para EXTRATO_BANCARIO",
        path: ["contaFinanceiraId"],
      });
    }
  });

export const importConfirmResponseSchema = z
  .object({
    imported: z.number().int().min(0),
    skippedDuplicates: z.number().int().min(0),
    failed: z.number().int().min(0),
  })
  .strict();

export const geminiPdfLineSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().min(1),
    amount: z.number(),
  })
  .strict();

export const geminiPdfLinesSchema = z.array(geminiPdfLineSchema).max(500);

export type ImportPreviewLine = z.infer<typeof importPreviewLineSchema>;
export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;
export type ImportConfirmRequest = z.infer<typeof importConfirmRequestSchema>;
