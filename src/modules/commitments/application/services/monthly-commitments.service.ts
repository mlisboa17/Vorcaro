import { prisma } from "@/lib/prisma";
import type { MonthlyCommitment } from "@/modules/commitments/domain/types/monthly-commitment";
import {
  aggregateByOrigin,
  computeLiabilityMonthlyPayment,
  deduplicateCommitments,
  decimalToNumber,
  mapTransactionTipo,
  monthRange,
  projectRecurringOccurrencesInMonth,
  resolveCommitmentStatus,
  toDateStr,
} from "@/modules/commitments/domain/services/commitment-projection.helpers";
import { buildInstallmentReadModelService } from "@/lib/api/installments";
import { buildConsortiumParcelDates, computeParcelValue } from "@/lib/consortium/consortium-domain";
import { formatYearMonthUtc } from "@/modules/installments/domain/installment-read-rules";
import { startOfUtcDay } from "@/modules/recurring-transactions/domain/services/calculate-next-recurring-date";
import type { PrismaClient } from "@prisma/client";

export type MonthlyCommitmentsResult = {
  month: string;
  totalOutflows: number;
  totalInflows: number;
  netCommitment: number;
  commitmentsCount: number;
  overdueCount: number;
  next7DaysCount: number;
  byOrigin: Array<{ origin: string; total: number; count: number }>;
  items: MonthlyCommitment[];
};

export class MonthlyCommitmentsService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async execute(userId: string, month: string): Promise<MonthlyCommitmentsResult> {
    const { start, end } = monthRange(month);
    const todayStr = toDateStr(new Date());
    const next7EndStr = toDateStr(new Date(Date.now() + 7 * 86400000));

    const items: MonthlyCommitment[] = [];
    const installmentTxIds = new Set<string>();
    const faturaCardMonths = new Set<string>();

    // 1. Recorrências — todas as ocorrências do mês
    const recs = await this.db.lancamentoRecorrente.findMany({
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
        category: { select: { name: true } },
        financialAccount: { select: { name: true } },
        card: { select: { name: true } },
      },
    });

    const liabilityIdsWithRecurring = new Set(
      recs.filter((r) => r.liabilityId).map((r) => r.liabilityId as string),
    );

    for (const r of recs) {
      const occurrences = projectRecurringOccurrencesInMonth(r, start, end);
      const origem = r.liabilityId ? "LIABILITY" : "RECURRENCE";
      const tipo = r.tipo === "RECEITA" ? "INFLOW" : "OUTFLOW";

      for (const occ of occurrences) {
        const d = toDateStr(occ.date);
        items.push({
          id: `rec-${r.id}-${d}`,
          origem,
          descricao: r.liabilityId ? `${r.descricao} (financiamento)` : r.descricao,
          tipo,
          valor: occ.valor,
          dataPrevista: d,
          categoria: r.category?.name ?? null,
          conta: r.financialAccount?.name ?? null,
          cartao: r.card?.name ?? null,
          status: resolveCommitmentStatus(d, todayStr),
        });
      }
    }

    // 2. Contas a receber (INFLOW)
    const recvs = await this.db.receivable.findMany({
      where: {
        userId,
        expectedDate: { gte: start, lt: end },
        status: { in: ["OPEN", "PARTIALLY_RECEIVED"] },
      },
      select: {
        id: true,
        descricao: true,
        devedorNome: true,
        valorPendente: true,
        expectedDate: true,
      },
    });

    for (const rv of recvs) {
      const d = toDateStr(new Date(rv.expectedDate as Date));
      items.push({
        id: `recv-${rv.id}`,
        origem: "RECEIVABLE",
        descricao: `${rv.descricao} — ${rv.devedorNome}`,
        tipo: "INFLOW",
        valor: decimalToNumber(rv.valorPendente),
        dataPrevista: d,
        categoria: null,
        conta: null,
        cartao: null,
        status: "PROJECTED",
      });
    }

    // 3. Parcelamentos (INSTALLMENT)
    try {
      const instService = buildInstallmentReadModelService();
      const future = await instService.getFutureCommitments(userId);
      for (const f of future) {
        if (f.data < toDateStr(start) || f.data >= toDateStr(end)) continue;
        installmentTxIds.add(f.transactionId);
        items.push({
          id: `inst-${f.transactionId}-${f.data}`,
          origem: "INSTALLMENT",
          descricao: f.descricao,
          tipo: "OUTFLOW",
          valor: f.valor,
          dataPrevista: f.data,
          categoria: null,
          conta: null,
          cartao: f.cartao,
          status: resolveCommitmentStatus(f.data, todayStr),
        });
      }
    } catch {
      /* parcelamentos opcionais */
    }

    // 4. Faturas de cartão (CREDIT_CARD) — agregadas por cartão + vencimento
    const cardTxs = await this.db.transaction.findMany({
      where: {
        userId,
        cardId: { not: null },
        dataVencimentoFatura: { gte: start, lt: end },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        dataVencimentoFatura: true,
        cardId: true,
        card: { select: { name: true } },
      },
    });

    const faturaGroups = new Map<
      string,
      { cardName: string; dueDate: string; total: number; descricao: string }
    >();

    for (const tx of cardTxs) {
      if (!tx.dataVencimentoFatura || !tx.cardId) continue;
      const dueDate = toDateStr(tx.dataVencimentoFatura);
      const key = `${tx.cardId}:${dueDate}`;
      faturaCardMonths.add(`${tx.cardId}:${formatYearMonthUtc(tx.dataVencimentoFatura)}`);
      const signed = tx.type === "INCOME" ? -decimalToNumber(tx.amount) : decimalToNumber(tx.amount);
      const existing = faturaGroups.get(key);
      if (existing) {
        existing.total += signed;
      } else {
        faturaGroups.set(key, {
          cardName: tx.card?.name ?? "Cartão",
          dueDate,
          total: signed,
          descricao: `Fatura ${tx.card?.name ?? "Cartão"}`,
        });
      }
    }

    for (const [key, group] of faturaGroups) {
      if (group.total <= 0) continue;
      items.push({
        id: `card-${key}`,
        origem: "CREDIT_CARD",
        descricao: group.descricao,
        tipo: "OUTFLOW",
        valor: group.total,
        dataPrevista: group.dueDate,
        categoria: null,
        conta: null,
        cartao: group.cardName,
        status: resolveCommitmentStatus(group.dueDate, todayStr),
      });
    }

    // 5. Transações futuras agendadas (sem fatura, sem parcela duplicada, sem financiamento recorrente)
    const scheduledTxs = await this.db.transaction.findMany({
      where: {
        userId,
        OR: [
          { date: { gte: start, lt: end } },
          { dataCaixa: { gte: start, lt: end } },
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
        installmentGroup: true,
        category: { select: { name: true } },
        account: { select: { name: true } },
        card: { select: { name: true } },
      },
    });

    for (const tx of scheduledTxs) {
      if (tx.dataVencimentoFatura) continue;
      if (tx.liabilityId && liabilityIdsWithRecurring.has(tx.liabilityId)) continue;
      if (installmentTxIds.has(tx.id)) continue;
      if (tx.installmentGroup) continue;

      const txDate = startOfUtcDay(tx.dataCaixa ?? tx.date);
      if (txDate < start || txDate >= end) continue;

      const d = toDateStr(txDate);
      items.push({
        id: `tx-${tx.id}`,
        origem: tx.liabilityId ? "LIABILITY" : "RECURRENCE",
        descricao: tx.description,
        tipo: mapTransactionTipo(tx.type),
        valor: decimalToNumber(tx.amount),
        dataPrevista: d,
        categoria: tx.category?.name ?? null,
        conta: tx.account?.name ?? null,
        cartao: tx.card?.name ?? null,
        status: resolveCommitmentStatus(d, todayStr),
      });
    }

    // 6. Consórcios
    const consorcios = await this.db.consortium.findMany({
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

    for (const c of consorcios) {
      const parcelDates = buildConsortiumParcelDates(c, start, end);
      const parcelValue = computeParcelValue(c);
      for (const pd of parcelDates) {
        const d = toDateStr(pd);
        items.push({
          id: `cons-${c.id}-${d}`,
          origem: "CONSORTIUM",
          descricao: c.nome,
          tipo: "OUTFLOW",
          valor: parcelValue,
          dataPrevista: d,
          categoria: null,
          conta: null,
          cartao: null,
          status: resolveCommitmentStatus(d, todayStr),
        });
      }
    }

    // 7. Passivos sem recorrência vinculada — parcela mensal estimada
    const liabilities = await this.db.patrimonyLiability.findMany({
      where: { userId, estaAtivo: true },
      select: {
        id: true,
        nome: true,
        saldoAtual: true,
        dataQuitacaoPrevista: true,
        dataContratacao: true,
      },
    });

    for (const l of liabilities) {
      if (liabilityIdsWithRecurring.has(l.id)) continue;
      const payment = computeLiabilityMonthlyPayment(l);
      if (!payment) continue;

      const dueDay = Math.min(payment.dueDay, new Date(end.getTime() - 86400000).getUTCDate());
      const d = `${month}-${String(dueDay).padStart(2, "0")}`;

      items.push({
        id: `liab-${l.id}-${month}`,
        origem: "LIABILITY",
        descricao: l.nome,
        tipo: "OUTFLOW",
        valor: payment.valor,
        dataPrevista: d,
        categoria: null,
        conta: null,
        cartao: null,
        status: resolveCommitmentStatus(d, todayStr),
      });
    }

    const deduped = deduplicateCommitments(items);

    const totalOutflows = deduped.filter((i) => i.tipo === "OUTFLOW").reduce((s, x) => s + x.valor, 0);
    const totalInflows = deduped.filter((i) => i.tipo === "INFLOW").reduce((s, x) => s + x.valor, 0);
    const byOrigin = aggregateByOrigin(deduped);

    return {
      month,
      totalOutflows,
      totalInflows,
      netCommitment: totalOutflows - totalInflows,
      commitmentsCount: deduped.length,
      overdueCount: deduped.filter((i) => i.status === "OVERDUE").length,
      next7DaysCount: deduped.filter(
        (i) => i.dataPrevista >= todayStr && i.dataPrevista <= next7EndStr,
      ).length,
      byOrigin,
      items: deduped.sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista)),
    };
  }
}
