import { z } from "zod";

export const FinancialImpactType = {
  LIABILITY_PAYMENT: "LIABILITY_PAYMENT",
} as const;

export type FinancialImpactTypeValue =
  (typeof FinancialImpactType)[keyof typeof FinancialImpactType];

export const ALLOCATION_TYPES = ["AMORTIZACAO", "JUROS", "SEGURO", "TAXA"] as const;

export type AllocationType = (typeof ALLOCATION_TYPES)[number];

const allocationSchema = z.object({
  tipo: z.enum(ALLOCATION_TYPES),
  valor: z.number().nonnegative(),
});

export const liabilityPaymentMetadataSchema = z.object({
  financialImpactType: z.literal(FinancialImpactType.LIABILITY_PAYMENT),
  allocations: z.array(allocationSchema).optional(),
});

export type TransactionAllocation = z.infer<typeof allocationSchema>;

export function buildLiabilityPaymentMetadata(
  allocations?: TransactionAllocation[],
): Record<string, unknown> {
  return {
    financialImpactType: FinancialImpactType.LIABILITY_PAYMENT,
    ...(allocations && allocations.length > 0 ? { allocations } : {}),
  };
}

export function mergeLiabilityPaymentMetadata(
  base: Record<string, unknown> | undefined,
  allocations?: TransactionAllocation[],
): Record<string, unknown> {
  return {
    ...(base ?? {}),
    ...buildLiabilityPaymentMetadata(allocations),
  };
}

export function sumAmortizacaoFromMetadata(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") {
    return 0;
  }

  const record = metadata as Record<string, unknown>;

  if (record.financialImpactType !== FinancialImpactType.LIABILITY_PAYMENT) {
    return 0;
  }

  const allocations = record.allocations;

  if (!Array.isArray(allocations)) {
    return 0;
  }

  return allocations.reduce((sum, item) => {
    if (!item || typeof item !== "object") {
      return sum;
    }

    const row = item as Record<string, unknown>;

    if (row.tipo !== "AMORTIZACAO") {
      return sum;
    }

    const valor = row.valor;

    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
      return sum;
    }

    return sum + valor;
  }, 0);
}

export function computeNextLiabilityBalance(currentBalance: number, amortizacao: number): number {
  const next = currentBalance - amortizacao;
  return Math.max(0, Math.round(next * 100) / 100);
}

export function computeRestoredLiabilityBalance(currentBalance: number, amortizacao: number): number {
  return Math.round((currentBalance + amortizacao) * 100) / 100;
}

export function getAmortizacaoAplicadaFromMetadata(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") {
    return 0;
  }

  const record = metadata as Record<string, unknown>;
  const applied = record.amortizacaoAplicada;

  if (typeof applied === "number" && Number.isFinite(applied) && applied > 0) {
    return applied;
  }

  return sumAmortizacaoFromMetadata(metadata);
}

export function stampAmortizacaoAplicada(
  metadata: Record<string, unknown>,
  amortizacaoAplicada: number,
): Record<string, unknown> {
  return {
    ...metadata,
    amortizacaoAplicada: Math.round(amortizacaoAplicada * 100) / 100,
  };
}

export function clearLiabilityPaymentMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  const { financialImpactType: _fi, allocations: _a, amortizacaoAplicada: _aa, ...rest } =
    metadata;

  return rest;
}

export function parseAllocationsInput(
  allocations: unknown,
): TransactionAllocation[] | undefined {
  if (!Array.isArray(allocations)) {
    return undefined;
  }

  const parsed = allocations
    .map((item) => allocationSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);

  return parsed.length > 0 ? parsed : undefined;
}
