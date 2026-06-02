import { Prisma } from "@prisma/client";

export type StoredTransactionAllocation = {
  tipo: string;
  valor: number;
  assetId?: string | null;
  liabilityId?: string | null;
};

export function toDefaultAllocationsJson(
  allocations: StoredTransactionAllocation[] | TransactionAllocationLike[] | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return Prisma.DbNull;
  }

  const normalized = allocations
    .filter(
      (allocation): allocation is StoredTransactionAllocation =>
        allocation != null &&
        typeof allocation.tipo === "string" &&
        allocation.tipo.trim().length > 0 &&
        typeof allocation.valor === "number" &&
        Number.isFinite(allocation.valor),
    )
    .map((allocation) => ({
      tipo: allocation.tipo,
      valor: allocation.valor,
      assetId: allocation.assetId ?? null,
      liabilityId: allocation.liabilityId ?? null,
    }));

  if (normalized.length === 0) {
    return Prisma.DbNull;
  }

  return normalized as Prisma.InputJsonValue;
}

type TransactionAllocationLike = {
  tipo: string;
  valor: number;
  assetId?: string | null;
  liabilityId?: string | null;
};
