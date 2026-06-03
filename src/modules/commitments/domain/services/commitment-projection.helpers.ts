import type { FrequenciaRecorrencia, TipoLancamentoRecorrente, TransactionType } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import {
  calculateNextRecurringDate,
  startOfUtcDay,
} from "@/modules/recurring-transactions/domain/services/calculate-next-recurring-date";
import type { CommitmentStatus, MonthlyCommitment } from "../types/monthly-commitment";

export function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

export function resolveCommitmentStatus(dataPrevista: string, todayStr: string, paid = false): CommitmentStatus {
  if (paid) return "PAID";
  if (dataPrevista < todayStr) return "OVERDUE";
  return "PENDING";
}

export type RecurringRow = {
  id: string;
  descricao: string;
  tipo: TipoLancamentoRecorrente;
  valor: Decimal;
  frequencia: FrequenciaRecorrencia;
  proximaExecucao: Date;
  dataFim: Date | null;
  diaInicioOriginal: number;
  liabilityId: string | null;
  category?: { name: string } | null;
  financialAccount?: { name: string } | null;
  card?: { name: string } | null;
};

/** Projeta todas as ocorrências de uma recorrência dentro do mês (semanal, quinzenal, mensal, etc.). */
export function projectRecurringOccurrencesInMonth(
  recurring: RecurringRow,
  monthStart: Date,
  monthEnd: Date,
): Array<{ date: Date; valor: number }> {
  const occurrences: Array<{ date: Date; valor: number }> = [];
  let occurrenceDate = startOfUtcDay(recurring.proximaExecucao);

  while (occurrenceDate < monthStart) {
    const next = calculateNextRecurringDate(
      occurrenceDate,
      recurring.frequencia,
      recurring.diaInicioOriginal,
    );
    if (recurring.dataFim && startOfUtcDay(next) > startOfUtcDay(recurring.dataFim)) {
      return occurrences;
    }
    occurrenceDate = startOfUtcDay(next);
  }

  while (occurrenceDate >= monthStart && occurrenceDate < monthEnd) {
    if (!recurring.dataFim || occurrenceDate <= startOfUtcDay(recurring.dataFim)) {
      occurrences.push({ date: occurrenceDate, valor: decimalToNumber(recurring.valor) });
    }
    const next = calculateNextRecurringDate(
      occurrenceDate,
      recurring.frequencia,
      recurring.diaInicioOriginal,
    );
    occurrenceDate = startOfUtcDay(next);
    if (recurring.dataFim && occurrenceDate > startOfUtcDay(recurring.dataFim)) {
      break;
    }
  }

  return occurrences;
}

/** Estima parcela mensal do passivo quando não há recorrência vinculada. */
export function computeLiabilityMonthlyPayment(liability: {
  saldoAtual: Decimal;
  dataQuitacaoPrevista: Date | null;
  dataContratacao: Date | null;
}): { valor: number; dueDay: number } | null {
  const saldo = decimalToNumber(liability.saldoAtual);
  if (saldo <= 0) return null;

  const quitacao = liability.dataQuitacaoPrevista;
  if (quitacao) {
    const now = startOfUtcDay(new Date());
    const quitacaoDay = startOfUtcDay(quitacao);
    const monthsRemaining = Math.max(
      1,
      (quitacaoDay.getUTCFullYear() - now.getUTCFullYear()) * 12 +
        (quitacaoDay.getUTCMonth() - now.getUTCMonth()) +
        (quitacaoDay.getUTCDate() >= now.getUTCDate() ? 0 : -1),
    );
    return {
      valor: Math.round((saldo / monthsRemaining) * 100) / 100,
      dueDay: quitacao.getUTCDate(),
    };
  }

  if (liability.dataContratacao) {
    return {
      valor: Math.round(saldo * 0.05 * 100) / 100,
      dueDay: liability.dataContratacao.getUTCDate(),
    };
  }

  return null;
}

export function mapTransactionTipo(type: TransactionType): "INFLOW" | "OUTFLOW" {
  return type === "INCOME" ? "INFLOW" : "OUTFLOW";
}

/**
 * Deduplicação mínima segura:
 * chave = descrição normalizada + data + valor (centavos).
 * Mantém a primeira ocorrência (prioridade de inserção no serviço).
 * Não elimina fatura vs parcela individual (limitação documentada).
 */
export function deduplicateCommitments(items: MonthlyCommitment[]): MonthlyCommitment[] {
  const seen = new Set<string>();
  const deduped: MonthlyCommitment[] = [];
  for (const it of items) {
    const normDesc = it.descricao.toLowerCase().trim().replace(/\s+/g, " ");
    const key = `${normDesc}|${it.dataPrevista}|${Math.round(it.valor * 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(it);
    }
  }
  return deduped;
}

export function aggregateByOrigin(items: MonthlyCommitment[]) {
  const map = items.reduce<Record<string, { origin: string; total: number; count: number }>>(
    (acc, it) => {
      acc[it.origem] = acc[it.origem] || { origin: it.origem, total: 0, count: 0 };
      acc[it.origem].total += it.valor;
      acc[it.origem].count += 1;
      return acc;
    },
    {},
  );
  return Object.values(map).sort((a, b) => b.total - a.total);
}
