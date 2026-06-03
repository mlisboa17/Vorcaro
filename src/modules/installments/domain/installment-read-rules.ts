import type { Prisma } from "@prisma/client";
import {
  parseInstallmentStructure,
} from "@/lib/financial/installment-structural-parser";

/**
 * Regra determinística de parcela paga/vencida (Sprint 7 — Fase 1).
 * Ordem: dataCaixa → dataVencimentoFatura → date (todos comparados em UTC, início do dia).
 */
export function resolveInstallmentReferenceDate(tx: {
  dataCaixa: Date | null;
  dataVencimentoFatura: Date | null;
  date: Date;
}): Date {
  return tx.dataCaixa ?? tx.dataVencimentoFatura ?? tx.date;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isInstallmentPaid(
  tx: {
    dataCaixa: Date | null;
    dataVencimentoFatura: Date | null;
    date: Date;
  },
  today: Date,
): boolean {
  const ref = startOfUtcDay(resolveInstallmentReferenceDate(tx));
  return ref.getTime() <= startOfUtcDay(today).getTime();
}

export function normalizeInstallmentGroupKey(
  installmentGroup: string | null | undefined,
  idGrupoParcelamento: string | null | undefined,
): string | null {
  const key = (installmentGroup ?? idGrupoParcelamento)?.trim();
  return key && key.length > 0 ? key : null;
}

export function resolveParcelaNumber(tx: {
  numeroParcela: number | null;
  currentInstallment: number | null;
  description?: string;
}): number | null {
  const n = tx.numeroParcela ?? tx.currentInstallment;
  if (n != null && n > 0) return n;

  const parsed = parseInstallmentStructure(tx.description ?? "");
  if (parsed.hadInstallmentMarker) {
    return parsed.numeroParcela;
  }

  return null;
}

export function resolveTotalParcelas(
  txs: Array<{
    totalParcelas: number | null;
    totalInstallments: number | null;
    installments: number;
    description?: string;
  }>,
  distinctParcelCount: number,
): number {
  let max = 0;
  for (const tx of txs) {
    const candidates = [tx.totalParcelas, tx.totalInstallments, tx.installments].filter(
      (v): v is number => v != null && v > 0,
    );
    for (const c of candidates) {
      if (c > max) max = c;
    }

    const parsed = parseInstallmentStructure(tx.description ?? "");
    if (parsed.hadInstallmentMarker && parsed.totalParcelas > max) {
      max = parsed.totalParcelas;
    }
  }
  return Math.max(max, distinctParcelCount, 1);
}

/**
 * Evita dupla contagem: ignora lançamentos de liquidação de fatura / QR na visão de parcelas.
 * Somente filtro de leitura — não altera dados persistidos.
 */
const EXCLUDED_DESCRIPTION_PATTERNS: RegExp[] = [
  /pagamento\s+(de\s+)?fatura/i,
  /pagamento\s+qr\s*(code)?/i,
  /liquidac(ao|ão)\s+(de\s+)?fatura/i,
  /fatura\s+consolidada/i,
];

export function isExcludedFromInstallmentReadModel(description: string): boolean {
  const normalized = description.trim();
  if (!normalized) return false;
  return EXCLUDED_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function decimalToCents(value: Prisma.Decimal | string | number): number {
  if (typeof value === "object" && value !== null && "toFixed" in value) {
    const parts = value.toFixed(2).split(".");
    const integer = parts[0] ?? "0";
    const decimal = (parts[1] ?? "00").padEnd(2, "0").slice(0, 2);
    return Number(`${integer}${decimal}`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatIsoDateUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatYearMonthUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** PAID = paga/vencida; OVERDUE = em aberto com data passada; OPEN = em aberto futura/hoje. */
export function resolveParcelStatus(
  paid: boolean,
  referenceDate: Date,
  today: Date,
): "PAID" | "OPEN" | "OVERDUE" {
  if (paid) return "PAID";
  const ref = startOfUtcDay(referenceDate);
  if (ref.getTime() < startOfUtcDay(today).getTime()) return "OVERDUE";
  return "OPEN";
}

export type InstallmentGroupResolution = {
  key: string;
  structured: boolean;
};

/** Agrupa transações sem installmentGroup via regex (somente leitura). */
export function resolveInstallmentGroupKey(tx: {
  description: string;
  amount: Prisma.Decimal | string | number;
  installmentGroup: string | null | undefined;
  idGrupoParcelamento: string | null | undefined;
  totalParcelas: number | null;
  totalInstallments: number | null;
  numeroParcela: number | null;
  currentInstallment: number | null;
  card: { id: string } | null;
}): InstallmentGroupResolution | null {
  const structuredKey = normalizeInstallmentGroupKey(tx.installmentGroup, tx.idGrupoParcelamento);
  if (structuredKey) {
    return { key: structuredKey, structured: true };
  }

  const parsed = parseInstallmentStructure(tx.description);
  const hasStructuredFields =
    (tx.totalParcelas ?? 0) > 1 ||
    (tx.totalInstallments ?? 0) > 1 ||
    (tx.numeroParcela ?? 0) > 1 ||
    (tx.currentInstallment ?? 0) > 1;

  if (!parsed.hadInstallmentMarker && !hasStructuredFields) {
    return null;
  }

  const totalParcelas =
    tx.totalParcelas ?? tx.totalInstallments ?? parsed.totalParcelas;
  const cardId = tx.card?.id ?? "no-card";
  const valorCents = decimalToCents(tx.amount);
  const key = `unstruct_${cardId}_${parsed.descricaoBase.toLowerCase()}_${totalParcelas}_${valorCents}`;

  return { key, structured: false };
}
