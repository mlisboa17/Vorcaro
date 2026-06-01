import { z } from "zod";
import type { FinancialExtraction } from "../../domain/ports/ai-service.port";

const paymentMethodTypeSchema = z.enum([
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "BOLETO",
  "TRANSFERENCIA_BANCARIA",
  "CARTEIRA_DIGITAL",
  "DEBITO_AUTOMATICO",
  "OTHER",
]);

const cardBrandSchema = z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]);

export const financialExtractionSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER", "UNKNOWN"]),
  amount: z.number().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  categoriaPrincipal: z.string().nullable().optional(),
  subcategoria: z.string().nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  paymentMethod: z.string().nullable(),
  paymentMethodType: paymentMethodTypeSchema.nullable(),
  financialInstitution: z.string().nullable(),
  cardLastFourDigits: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
  cardBrand: cardBrandSchema.nullable(),
  installments: z.number().int().min(1).nullable(),
  confidence: z.record(z.string(), z.number()),
  missingFields: z.array(z.string()),
  followUpQuestion: z.string().nullable(),
});

export function parseFinancialExtraction(data: unknown): FinancialExtraction {
  const parsed = financialExtractionSchema.parse(data);
  return {
    ...parsed,
    categoriaPrincipal: parsed.categoriaPrincipal ?? null,
    subcategoria: parsed.subcategoria ?? null,
  };
}
