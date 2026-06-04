import type { FinancialTimelineEventType } from "@prisma/client";

/** Formato: `{userId}:{eventType}:{periodOrEntityKey}` */
export function buildTimelineFingerprint(
  userId: string,
  eventType: FinancialTimelineEventType,
  periodOrEntityKey: string,
): string {
  return `${userId}:${eventType}:${periodOrEntityKey}`;
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function snapshotDateKey(d: Date): string {
  return startOfUtcDay(d).toISOString().slice(0, 10);
}

/** Período mensal YYYY-MM — evita evento duplicado a cada execução diária. */
export function monthPeriodKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Período trimestral YYYY-Qn. */
export function quarterPeriodKey(d: Date): string {
  const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${quarter}`;
}

export function percentChange(current: number, past: number): number | null {
  if (past === 0) return current === 0 ? 0 : null;
  return ((current - past) / Math.abs(past)) * 100;
}

export function resolveTrendDirection(
  delta: number | null,
  thresholdPercent = 3,
): "IMPROVING" | "STABLE" | "DECLINING" {
  if (delta == null || Math.abs(delta) < thresholdPercent) return "STABLE";
  return delta > 0 ? "IMPROVING" : "DECLINING";
}

/** Para métricas onde queda é positiva (dívida, gastos). */
export function resolveTrendDirectionInverse(
  delta: number | null,
): "IMPROVING" | "STABLE" | "DECLINING" {
  if (delta == null || Math.abs(delta) < 3) return "STABLE";
  return delta < 0 ? "IMPROVING" : "DECLINING";
}
