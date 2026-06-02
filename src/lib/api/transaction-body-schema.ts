import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { ALLOCATION_TYPES } from "@/lib/financial/liability-payment-metadata";

export const transactionAllocationSchema = z.object({
  tipo: z.enum(ALLOCATION_TYPES),
  valor: z.number().nonnegative(),
});

export const transactionPatrimonyFieldsSchema = {
  liabilityId: z.string().min(1).nullable().optional(),
  allocations: z.array(transactionAllocationSchema).optional(),
};

export const createTransactionBodySchema = z.object({
  descricao: z.string().min(1),
  valor: z.number().positive(),
  tipo: z.nativeEnum(TransactionType),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoriaId: z.string().min(1),
  contaFinanceiraId: z.string().min(1),
  formaPagamentoId: z.string().min(1),
  cartaoId: z.string().min(1).nullable().optional(),
  parcelas: z.number().int().min(1).optional(),
  ...transactionPatrimonyFieldsSchema,
});

export const updateTransactionBodySchema = z.object({
  descricao: z.string().min(1),
  valor: z.number().positive(),
  tipo: z.nativeEnum(TransactionType),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoriaId: z.string().min(1),
  contaFinanceiraId: z.string().min(1),
  metodoPagamentoId: z.string().min(1),
  cartaoId: z.string().min(1).nullable().optional(),
  parcelas: z.number().int().min(1),
  ...transactionPatrimonyFieldsSchema,
});
