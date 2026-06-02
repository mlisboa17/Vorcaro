import type { FrequenciaRecorrencia, PrismaClient, TransactionType } from "@prisma/client";
import { calculateNextRecurringDate } from "@/modules/recurring-transactions/domain/services/calculate-next-recurring-date";
import { buildConsortiumParcelDates } from "@/lib/consortium/consortium-domain";
import type {
  CashFlowProjectionDTO,
  CashflowProjectionAlertDto,
  CashflowProjectionEventDto,
} from "@/types/cashflow";

const DAY_MS = 24 * 60 * 60 * 1000;
const HORIZONS = [7, 30, 60, 90, 180, 365] as const;

type TimelineEvent = {
  id: string;
  date: Date;
  description: string;
  amountCents: number;
  origin: CashflowProjectionEventDto["origem"];
};

type RecurringRecord = {
  id: string;
  descricao: string;
  tipo: "RECEITA" | "DESPESA";
  valor: string;
  frequencia: FrequenciaRecorrencia;
  proximaExecucao: Date;
  dataFim: Date | null;
  diaInicioOriginal: number;
  liabilityId: string | null;
};

type TransactionRecord = {
  id: string;
  type: TransactionType;
  amount: string;
  description: string;
  date: Date;
  dataCaixa: Date | null;
  dataVencimentoFatura: Date | null;
  cardId: string | null;
  liabilityId: string | null;
};

type LiabilityRecord = {
  id: string;
  nome: string;
  saldoAtual: string;
};

type ConsortiumRecord = {
  id: string;
  nome: string;
  valorCredito: string;
  valorTaxas: string;
  quantidadeParcelas: number;
  parcelasPagas: number;
  dataContratacao: Date | null;
  createdAt: Date;
};

type CashflowProjectionDataSource = {
  getActiveAccountsBalance(userId: string): Promise<string[]>;
  getFutureTransactions(userId: string, until: Date): Promise<TransactionRecord[]>;
  getActiveRecurring(userId: string): Promise<RecurringRecord[]>;
  getActiveLiabilities(userId: string): Promise<LiabilityRecord[]>;
  getActiveConsortiums(userId: string): Promise<ConsortiumRecord[]>;
};

class PrismaCashflowProjectionDataSource implements CashflowProjectionDataSource {
  constructor(private readonly prisma: PrismaClient) {}

  async getActiveAccountsBalance(userId: string): Promise<string[]> {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { userId, isActive: true },
      select: { balance: true },
    });
    return accounts.map((account) => account.balance.toFixed(2));
  }

  async getFutureTransactions(userId: string, until: Date): Promise<TransactionRecord[]> {
    const today = startOfUtcDay(new Date());
    const records = await this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { date: { gt: today, lte: until } },
          { dataCaixa: { gt: today, lte: until } },
          { dataVencimentoFatura: { gt: today, lte: until } },
        ],
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        dataCaixa: true,
        dataVencimentoFatura: true,
        cardId: true,
        liabilityId: true,
      },
    });

    return records.map((record) => ({
      ...record,
      amount: record.amount.toFixed(2),
    }));
  }

  async getActiveRecurring(userId: string): Promise<RecurringRecord[]> {
    const records = await this.prisma.lancamentoRecorrente.findMany({
      where: { userId, estaAtivo: true },
      select: {
        id: true,
        descricao: true,
        tipo: true,
        valor: true,
        frequencia: true,
        proximaExecucao: true,
        dataFim: true,
        diaInicioOriginal: true,
        liabilityId: true,
      },
    });

    return records.map((record) => ({
      ...record,
      valor: record.valor.toFixed(2),
    }));
  }

  async getActiveLiabilities(userId: string): Promise<LiabilityRecord[]> {
    const liabilities = await this.prisma.patrimonyLiability.findMany({
      where: { userId, estaAtivo: true },
      select: { id: true, nome: true, saldoAtual: true },
    });
    return liabilities.map((item) => ({ ...item, saldoAtual: item.saldoAtual.toFixed(2) }));
  }

  async getActiveConsortiums(userId: string): Promise<ConsortiumRecord[]> {
    const consortiums = await this.prisma.consortium.findMany({
      where: { userId, estaAtivo: true, status: { not: "COMPLETED" } },
      select: {
        id: true,
        nome: true,
        valorCredito: true,
        valorTaxas: true,
        quantidadeParcelas: true,
        parcelasPagas: true,
        dataContratacao: true,
        createdAt: true,
      },
    });

    return consortiums.map((item) => ({
      ...item,
      valorCredito: item.valorCredito.toFixed(2),
      valorTaxas: item.valorTaxas.toFixed(2),
    }));
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(startOfUtcDay(date).getTime() + days * DAY_MS);
}

function toDateOnlyIso(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function decimalStringToCents(value: string): number {
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [integer, decimal = ""] = normalized.split(".");
  const centsRaw = `${integer}${decimal.padEnd(2, "0").slice(0, 2)}`;
  const cents = Number(centsRaw || "0");
  return negative ? -cents : cents;
}

function centsToNumber(cents: number): number {
  return cents / 100;
}

function signedAmountCentsByTransactionType(amountCents: number, type: TransactionType): number {
  if (type === "EXPENSE") return -amountCents;
  return amountCents;
}

function mapRecurringAmount(tipo: "RECEITA" | "DESPESA", amountCents: number): number {
  return tipo === "DESPESA" ? -amountCents : amountCents;
}

export class CashflowProjectionService {
  constructor(private readonly dataSource: CashflowProjectionDataSource) {}

  async execute(userId: string): Promise<CashFlowProjectionDTO> {
    const today = startOfUtcDay(new Date());
    const maxHorizonDate = addDays(today, 365);

    const [accountBalances, futureTransactions, recurringRules, liabilities, consortiums] =
      await Promise.all([
        this.dataSource.getActiveAccountsBalance(userId),
        this.dataSource.getFutureTransactions(userId, maxHorizonDate),
        this.dataSource.getActiveRecurring(userId),
        this.dataSource.getActiveLiabilities(userId),
        this.dataSource.getActiveConsortiums(userId),
      ]);

    const saldoAtualCents = accountBalances.reduce(
      (sum, balance) => sum + decimalStringToCents(balance),
      0,
    );

    const events: TimelineEvent[] = [];
    const liabilityMap = new Map(liabilities.map((liability) => [liability.id, liability.nome]));

    for (const tx of futureTransactions) {
      const txDate = tx.dataCaixa ?? tx.date;
      if (txDate <= today) continue;
      if (txDate > maxHorizonDate) continue;

      const amountCents = decimalStringToCents(tx.amount);
      const signedAmount = signedAmountCentsByTransactionType(amountCents, tx.type);

      if (tx.cardId && tx.dataVencimentoFatura) {
        if (tx.dataVencimentoFatura <= today || tx.dataVencimentoFatura > maxHorizonDate) continue;
        events.push({
          id: `fatura-${tx.id}`,
          date: tx.dataVencimentoFatura,
          description: tx.description,
          amountCents: signedAmount,
          origin: "FATURA",
        });
        continue;
      }

      const financingName = tx.liabilityId ? liabilityMap.get(tx.liabilityId) : null;
      if (financingName) {
        events.push({
          id: `fin-${tx.id}`,
          date: txDate,
          description: `${tx.description} (${financingName})`,
          amountCents: signedAmount,
          origin: "FINANCIAMENTO",
        });
        continue;
      }

      events.push({
        id: `tx-${tx.id}`,
        date: txDate,
        description: tx.description,
        amountCents: signedAmount,
        origin: tx.type === "INCOME" ? "RECEITA" : "DESPESA",
      });
    }

    for (const recurring of recurringRules) {
      let occurrenceDate = startOfUtcDay(recurring.proximaExecucao);
      const recurringAmount = mapRecurringAmount(
        recurring.tipo,
        decimalStringToCents(recurring.valor),
      );

      while (occurrenceDate <= maxHorizonDate) {
        if (occurrenceDate > today) {
          const origin: TimelineEvent["origin"] = recurring.liabilityId
            ? "FINANCIAMENTO"
            : "RECORRENCIA";
          const suffix = recurring.liabilityId
            ? ` (${liabilityMap.get(recurring.liabilityId) ?? "Financiamento"})`
            : "";

          events.push({
            id: `rec-${recurring.id}-${toDateOnlyIso(occurrenceDate)}`,
            date: occurrenceDate,
            description: `${recurring.descricao}${suffix}`,
            amountCents: recurringAmount,
            origin,
          });
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
    }

    for (const consortium of consortiums) {
      if (consortium.quantidadeParcelas <= consortium.parcelasPagas) {
        continue;
      }

      const creditoCents = decimalStringToCents(consortium.valorCredito);
      const taxasCents = decimalStringToCents(consortium.valorTaxas);
      const parcelCents = Math.round(
        (creditoCents + taxasCents) / Math.max(consortium.quantidadeParcelas, 1),
      );

      const parcelDates = buildConsortiumParcelDates(consortium, today, maxHorizonDate);
      parcelDates.forEach((parcelDate, index) => {
        events.push({
          id: `cons-${consortium.id}-${toDateOnlyIso(parcelDate)}-${index}`,
          date: parcelDate,
          description: `Parcela consórcio — ${consortium.nome}`,
          amountCents: -parcelCents,
          origin: "CONSORCIO",
        });
      });
    }

    events.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

    let running: number = saldoAtualCents;
    let firstNegativeDate: string | null = null;
    const horizonProjection = new Map<number, number>();
    const horizonDates = new Map(HORIZONS.map((days) => [days, addDays(today, days)]));

    for (const event of events) {
      running += event.amountCents;
      if (firstNegativeDate === null && running < 0) {
        firstNegativeDate = toDateOnlyIso(event.date);
      }

      for (const horizon of HORIZONS) {
        if (horizonProjection.has(horizon)) continue;
        const limitDate = horizonDates.get(horizon)!;
        if (event.date > limitDate) {
          horizonProjection.set(horizon, running - event.amountCents);
        }
      }
    }

    for (const horizon of HORIZONS) {
      if (!horizonProjection.has(horizon)) {
        horizonProjection.set(horizon, running);
      }
    }

    const eventsNext30 = events.filter((event) => event.date <= horizonDates.get(30)!);
    const totalOutflowNext30 = eventsNext30.reduce((sum, event) => {
      if (event.amountCents >= 0) return sum;
      return sum + -event.amountCents;
    }, 0);

    const outflowByOrigin = eventsNext30.reduce<Record<string, number>>((acc, event) => {
      if (event.amountCents >= 0) return acc;
      acc[event.origin] = (acc[event.origin] ?? 0) + -event.amountCents;
      return acc;
    }, {});

    const alerts: CashflowProjectionAlertDto[] = [];
    if (firstNegativeDate) {
      const negativeInDays = Math.max(
        0,
        Math.floor(
          (startOfUtcDay(new Date(`${firstNegativeDate}T00:00:00.000Z`)).getTime() -
            today.getTime()) /
            DAY_MS,
        ),
      );
      alerts.push({
        tipo: "CAIXA_NEGATIVO",
        mensagem: `Seu saldo ficará negativo em ${negativeInDays} dia(s), na data ${firstNegativeDate}.`,
        gravidade: "CRITICAL",
      });
    }

    if (totalOutflowNext30 > 0) {
      for (const [origin, amount] of Object.entries(outflowByOrigin)) {
        const concentration = (amount / totalOutflowNext30) * 100;
        if (concentration > 40) {
          alerts.push({
            tipo: "CONCENTRACAO_DESPESAS",
            mensagem: `A origem ${origin} concentra ${concentration.toFixed(
              1,
            )}% das saídas previstas para os próximos 30 dias.`,
            gravidade: "WARNING",
          });
          break;
        }
      }
    }

    if (eventsNext30.length > 20) {
      alerts.push({
        tipo: "EXCESSO_COMPROMISSOS",
        mensagem: `Você possui ${eventsNext30.length} compromissos financeiros previstos para os próximos 30 dias.`,
        gravidade: "INFO",
      });
    }

    const dtoEvents: CashflowProjectionEventDto[] = events.map((event) => ({
      id: event.id,
      data: toDateOnlyIso(event.date),
      descricao: event.description,
      valor: centsToNumber(event.amountCents),
      origem: event.origin,
    }));

    return {
      saldoAtual: centsToNumber(saldoAtualCents),
      previsao7Dias: centsToNumber(horizonProjection.get(7)!),
      previsao30Dias: centsToNumber(horizonProjection.get(30)!),
      previsao60Dias: centsToNumber(horizonProjection.get(60)!),
      previsao90Dias: centsToNumber(horizonProjection.get(90)!),
      previsao180Dias: centsToNumber(horizonProjection.get(180)!),
      previsao365Dias: centsToNumber(horizonProjection.get(365)!),
      primeiraDataNegativa: firstNegativeDate,
      eventos: dtoEvents,
      alertas: alerts,
    };
  }
}

export function buildCashflowProjectionService(prisma: PrismaClient): CashflowProjectionService {
  return new CashflowProjectionService(new PrismaCashflowProjectionDataSource(prisma));
}

