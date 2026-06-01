import type {
  FrequenciaRecorrencia,
  TipoLancamentoRecorrente,
  TransactionType,
} from "@prisma/client";

const MONTHLY_FREQUENCIES: Partial<Record<FrequenciaRecorrencia, number>> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

export function parseDateOnlyToUtcNoon(value: string): Date {
  const parsed = new Date(`${value}T12:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida: ${value}`);
  }

  return parsed;
}

export function extractOriginalStartDay(date: Date): number {
  return date.getUTCDate();
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

export function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

export function calculateNextRecurringDate(
  currentDate: Date,
  frequency: FrequenciaRecorrencia,
  originalStartDay: number,
): Date {
  const base = parseDateOnlyToUtcNoon(currentDate.toISOString().slice(0, 10));

  if (frequency === "SEMANAL") {
    return addUtcDays(base, 7);
  }

  if (frequency === "QUINZENAL") {
    return addUtcDays(base, 15);
  }

  const monthsToAdd = MONTHLY_FREQUENCIES[frequency];

  if (monthsToAdd) {
    return addUtcMonthsClamped(base, monthsToAdd, originalStartDay);
  }

  throw new Error(`Frequência de recorrência não suportada: ${frequency}`);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return parseDateOnlyToUtcNoon(next.toISOString().slice(0, 10));
}

function addUtcMonthsClamped(from: Date, monthsToAdd: number, originalStartDay: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const targetIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(originalStartDay, lastDayOfMonth);

  return new Date(Date.UTC(targetYear, targetMonth, day, 12, 0, 0, 0));
}

export function mapRecurringTypeToTransactionType(tipo: TipoLancamentoRecorrente): TransactionType {
  return tipo === "RECEITA" ? "INCOME" : "EXPENSE";
}

export function isRecurringExpired(proximaExecucao: Date, dataFim: Date | null): boolean {
  if (!dataFim) {
    return false;
  }

  return startOfUtcDay(proximaExecucao).getTime() > startOfUtcDay(dataFim).getTime();
}

export function computeProximaExecucaoForSeed(
  dataInicio: Date,
  frequency: FrequenciaRecorrencia,
  originalStartDay: number,
  referenceDate = new Date(),
): Date {
  let next = dataInicio;

  while (true) {
    const following = calculateNextRecurringDate(next, frequency, originalStartDay);

    if (endOfUtcDay(following).getTime() > endOfUtcDay(referenceDate).getTime()) {
      return next;
    }

    next = following;
  }
}
