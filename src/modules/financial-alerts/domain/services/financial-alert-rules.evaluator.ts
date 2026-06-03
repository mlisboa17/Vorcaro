import type { PrismaClient } from "@prisma/client";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import { buildMonthlyCommitmentsUseCases } from "@/lib/api/monthly-commitments";
import { buildReceivableUseCases } from "@/lib/api/receivable-use-cases";
import { MonthFinancialOverviewService } from "@/modules/executive-dashboard/application/services/month-financial-overview.service";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";
import { isReceivableOpenStatus } from "@/modules/receivables/domain/services/receivable.service";
import type { AlertRuleCandidate } from "../types/financial-alert";
import { buildAlertFingerprint } from "./alert-fingerprint";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

function isNegativeWithinDays(
  saldoAtual: number,
  eventos: Array<{ data: string; valor: number }>,
  days: number,
): boolean {
  const today = startOfDay(new Date());
  const end = new Date(today.getTime() + days * DAY_MS);
  const byDate = new Map<string, number>();

  for (const e of eventos) {
    const d = new Date(`${e.data}T12:00:00.000Z`);
    if (d <= today || d > end) continue;
    const key = e.data;
    byDate.set(key, (byDate.get(key) ?? 0) + e.valor);
  }

  const sortedDates = [...byDate.keys()].sort();
  let balance = saldoAtual;
  for (const key of sortedDates) {
    balance += byDate.get(key) ?? 0;
    if (balance < 0) return true;
  }
  return false;
}

function isReimbursementOrigem(origem: string | null, descricao: string): boolean {
  const hay = `${origem ?? ""} ${descricao}`.toLowerCase();
  return hay.includes("reembolso") || hay.includes("reimburse");
}

export class FinancialAlertRulesEvaluator {
  constructor(private readonly prisma: PrismaClient) {}

  async evaluate(userId: string, referenceDate = new Date()): Promise<AlertRuleCandidate[]> {
    const month = referenceDate.toISOString().slice(0, 7);
    const today = startOfDay(referenceDate);
    const candidates: AlertRuleCandidate[] = [];

    const [commitments, monthOverview] = await Promise.all([
      buildMonthlyCommitmentsUseCases().getMonthly(userId, month),
      new MonthFinancialOverviewService(this.prisma).getCurrentMonth(userId, referenceDate),
    ]);

    const receitaReferencia = monthOverview.receitas > 0 ? monthOverview.receitas : 0;

    for (const item of commitments.items) {
      if (item.tipo !== "OUTFLOW" || item.status === "PAID") continue;
      const due = new Date(`${item.dataPrevista}T12:00:00.000Z`);
      const days = daysBetween(today, due);
      if (days < 0 || days > 7) continue;

      candidates.push({
        fingerprint: buildAlertFingerprint("UPCOMING_PAYMENT", item.id),
        type: "UPCOMING_PAYMENT",
        severity: "WARNING",
        title: "Pagamento próximo",
        description: `${item.descricao} vence em ${days === 0 ? "hoje" : `${days} dia(s)`} (${item.dataPrevista}) — R$ ${item.valor.toFixed(2)}.`,
        metadata: {
          commitmentId: item.id,
          dataPrevista: item.dataPrevista,
          valor: item.valor,
          origem: item.origem,
        },
        actionUrl: "/dashboard/commitments",
        active: true,
      });
    }

    const { list } = buildReceivableUseCases();
    const receivables = await list.execute(userId, false);

    for (const r of receivables) {
      if (!isReceivableOpenStatus(r.status)) continue;

      if (r.expectedDate) {
        const due = startOfDay(r.expectedDate);
        if (due < today) {
          candidates.push({
            fingerprint: buildAlertFingerprint("OVERDUE_RECEIVABLE", r.id),
            type: "OVERDUE_RECEIVABLE",
            severity: "WARNING",
            title: "Recebível atrasado",
            description: `${r.descricao} (${r.devedorNome}) venceu em ${due.toISOString().slice(0, 10)} — pendente R$ ${r.valorPendente.toFixed(2)}.`,
            metadata: {
              receivableId: r.id,
              expectedDate: due.toISOString().slice(0, 10),
              valorPendente: r.valorPendente,
            },
            actionUrl: "/dashboard/receivables",
            active: true,
          });
        }
      }

      const daysPending = daysBetween(startOfDay(r.createdAt), today);
      if (
        daysPending > 15 &&
        (isReimbursementOrigem(r.origem, r.descricao) || r.origem === "INBOX_REIMBURSEMENT")
      ) {
        candidates.push({
          fingerprint: buildAlertFingerprint("REIMBURSEMENT_DELAY", r.id),
          type: "REIMBURSEMENT_DELAY",
          severity: "WARNING",
          title: "Reembolso atrasado",
          description: `${r.descricao} pendente há ${daysPending} dias — R$ ${r.valorPendente.toFixed(2)}.`,
          metadata: {
            receivableId: r.id,
            daysPending,
            valorPendente: r.valorPendente,
          },
          actionUrl: "/dashboard/receivables",
          active: true,
        });
      }
    }

    const creditCardTotal = commitments.items
      .filter((i) => i.origem === "CREDIT_CARD" && i.tipo === "OUTFLOW" && i.status !== "PAID")
      .reduce((s, i) => s + i.valor, 0);

    const creditCardActive =
      receitaReferencia > 0 && creditCardTotal / receitaReferencia > 0.3;

    candidates.push({
      fingerprint: buildAlertFingerprint("CREDIT_CARD_RISK", month),
      type: "CREDIT_CARD_RISK",
      severity: "CRITICAL",
      title: "Risco de cartão de crédito",
      description: creditCardActive
        ? `Faturas futuras (R$ ${creditCardTotal.toFixed(2)}) representam ${Math.round((creditCardTotal / receitaReferencia) * 100)}% da renda prevista do mês (limite 30%).`
        : "Condição de risco de cartão não ativa.",
      metadata: {
        month,
        creditCardTotal,
        receitaReferencia,
        percentual: receitaReferencia > 0 ? creditCardTotal / receitaReferencia : 0,
      },
      actionUrl: "/dashboard/commitments",
      active: creditCardActive,
    });

    const highCommitmentActive =
      receitaReferencia > 0 && commitments.totalOutflows / receitaReferencia > 0.8;

    candidates.push({
      fingerprint: buildAlertFingerprint("HIGH_COMMITMENT_MONTH", month),
      type: "HIGH_COMMITMENT_MONTH",
      severity: "CRITICAL",
      title: "Mês com alto comprometimento",
      description: highCommitmentActive
        ? `Compromissos (R$ ${commitments.totalOutflows.toFixed(2)}) representam ${Math.round((commitments.totalOutflows / receitaReferencia) * 100)}% da renda prevista (limite 80%).`
        : "Comprometimento mensal dentro do limite.",
      metadata: {
        month,
        totalOutflows: commitments.totalOutflows,
        receitaReferencia,
        percentual:
          receitaReferencia > 0 ? commitments.totalOutflows / receitaReferencia : 0,
      },
      actionUrl: "/dashboard/commitments",
      active: highCommitmentActive,
    });

    const planning = new FinancialPlanningService(this.prisma);
    const goals = await planning.getGoals(userId);

    for (const goal of goals) {
      if (goal.status !== "ACTIVE") continue;
      const atRisk =
        !goal.viabilidade.viavel ||
        goal.viabilidade.atrasada ||
        goal.viabilidade.risco === "HIGH" ||
        goal.viabilidade.statusVisual === "RISCO_ALTO" ||
        goal.viabilidade.statusVisual === "ATRASADA";

      candidates.push({
        fingerprint: buildAlertFingerprint("GOAL_AT_RISK", goal.id),
        type: "GOAL_AT_RISK",
        severity: "WARNING",
        title: "Meta financeira em risco",
        description: atRisk
          ? `A meta "${goal.nome}" pode não ser atingida no prazo com o ritmo atual de poupança.`
          : `Meta "${goal.nome}" dentro da projeção.`,
        metadata: {
          goalId: goal.id,
          nome: goal.nome,
          viavel: goal.viabilidade.viavel,
          atrasada: goal.viabilidade.atrasada,
          risco: goal.viabilidade.risco,
        },
        actionUrl: "/dashboard/planning",
        active: atRisk,
      });
    }

    const cashflow = await buildCashflowProjectionService(this.prisma).execute(userId);
    const cashflowNegative15 = isNegativeWithinDays(
      cashflow.saldoAtual,
      cashflow.eventos,
      15,
    );

    candidates.push({
      fingerprint: buildAlertFingerprint("CASHFLOW_WARNING", "next-15d"),
      type: "CASHFLOW_WARNING",
      severity: "CRITICAL",
      title: "Alerta de fluxo de caixa",
      description: cashflowNegative15
        ? "O saldo projetado fica negativo nos próximos 15 dias."
        : "Fluxo de caixa projetado estável nos próximos 15 dias.",
      metadata: {
        saldoAtual: cashflow.saldoAtual,
        primeiraDataNegativa: cashflow.primeiraDataNegativa,
      },
      actionUrl: "/dashboard/cashflow",
      active: cashflowNegative15,
    });

    return candidates;
  }
}
