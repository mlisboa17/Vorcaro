import type { PrismaClient } from "@prisma/client";
import { buildMonthlyCommitmentsUseCases } from "@/lib/api/monthly-commitments";
import { buildReceivableUseCases } from "@/lib/api/receivable-use-cases";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import { MonthFinancialOverviewService } from "@/modules/executive-dashboard/application/services/month-financial-overview.service";
import { FinancialAlertQueryService } from "@/modules/financial-alerts/application/services/financial-alert-query.service";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";
import { isReceivableOpenStatus } from "@/modules/receivables/domain/services/receivable.service";
import type { FinancialAlertRecord } from "@/modules/financial-alerts/domain/types/financial-alert";
import type { AdvisorConsultation, AdvisorRisk } from "../../domain/types/advisor-action";
import { AdvisorActionBuilderService } from "./advisor-action-builder.service";
import { FinancialHealthScoreService } from "./financial-health-score.service";
import { AdvisorActionGuardrailService } from "./advisor-action-guardrail.service";
import {
  MoneyLeakDetectorService,
  type MonthlySpendPoint,
} from "./money-leak-detector.service";
import { SmartSavingsOpportunitiesService } from "./smart-savings-opportunities.service";
import { SpendingHealthAnalyzerService } from "./spending-health-analyzer.service";
import {
  SubscriptionDetectorService,
  type RecurringExpenseRow,
} from "./subscription-detector.service";

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export class IntelligentAdvisorService {
  private readonly subscriptionDetector = new SubscriptionDetectorService();
  private readonly moneyLeakDetector = new MoneyLeakDetectorService();
  private readonly spendingAnalyzer = new SpendingHealthAnalyzerService();
  private readonly healthScoreService = new FinancialHealthScoreService();
  private readonly savingsService = new SmartSavingsOpportunitiesService();
  private readonly actionBuilder = new AdvisorActionBuilderService();
  private readonly guardrail = new AdvisorActionGuardrailService();

  constructor(private readonly prisma: PrismaClient) {}

  async consult(userId: string): Promise<AdvisorConsultation> {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);

    const [
      monthOverview,
      openAlerts,
      alertSummary,
      receivables,
      goals,
      commitments,
      recurringRows,
      transactions,
      cashflow,
    ] = await Promise.all([
      new MonthFinancialOverviewService(this.prisma).getCurrentMonth(userId),
      new FinancialAlertQueryService(this.prisma).list(userId, 1, 30, { status: "OPEN" }),
      new FinancialAlertQueryService(this.prisma).summary(userId),
      buildReceivableUseCases().list.execute(userId, false),
      new FinancialPlanningService(this.prisma).getGoals(userId),
      buildMonthlyCommitmentsUseCases().getMonthly(userId, monthKey(now)),
      this.loadRecurringExpenses(userId),
      this.loadExpenseTransactions(userId, threeMonthsAgo),
      buildCashflowProjectionService(this.prisma).execute(userId),
    ]);

    const monthsActive = this.estimateMonthsActive(recurringRows, threeMonthsAgo);
    const spendPoints = this.toMonthlySpendPoints(transactions, recurringRows);
    const subscriptionDuplicates = this.subscriptionDetector.detect(recurringRows);
    const moneyLeaks = this.moneyLeakDetector.detect(recurringRows, monthsActive, spendPoints);
    const spendingHealth = this.spendingAnalyzer.analyze(transactions, monthOverview.receitas);

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const overdueReceivables = receivables.filter(
      (r) =>
        isReceivableOpenStatus(r.status) &&
        r.expectedDate &&
        r.expectedDate < today,
    );

    const goalsAtRisk = goals
      .filter((g) => g.status === "ACTIVE")
      .filter(
        (g) =>
          !g.viabilidade.viavel ||
          g.viabilidade.atrasada ||
          g.viabilidade.risco === "HIGH" ||
          g.viabilidade.statusVisual === "RISCO_ALTO" ||
          g.viabilidade.statusVisual === "ATRASADA",
      )
      .map((g) => ({ id: g.id, nome: g.nome, atRisk: true }));

    const income = monthOverview.receitas > 0 ? monthOverview.receitas : 0;
    const commitmentPercent = income > 0 ? (commitments.totalOutflows / income) * 100 : 0;
    const highCommitment = commitmentPercent > 80;

    const rawActions = this.actionBuilder.build({
      openAlerts: openAlerts.items,
      overdueReceivables: overdueReceivables.map((r) => ({
        id: r.id,
        descricao: r.descricao,
        valorPendente: r.valorPendente,
        expectedDate: r.expectedDate,
        status: r.status,
      })),
      goalsAtRisk,
      subscriptionDuplicates,
      moneyLeaks,
      spendingHealth,
      highCommitment,
    });

    const healthScore = this.healthScoreService.compute({
      criticalAlerts: alertSummary.totalCritical,
      warningAlerts: alertSummary.bySeverity.WARNING,
      commitmentPercent,
      goalsAtRisk: goalsAtRisk.length,
      overdueReceivableAmount: overdueReceivables.reduce((s, r) => s + r.valorPendente, 0),
      subscriptionDuplicates,
      moneyLeaks,
    });

    const actions = this.guardrail.validateActions(rawActions);

    const savingsOpportunities = this.savingsService.build(
      actions,
      subscriptionDuplicates,
      moneyLeaks,
      spendingHealth,
    );

    const risks = this.buildRisks(openAlerts.items, cashflow.primeiraDataNegativa, overdueReceivables);
    const recommendations = this.buildRecommendations(actions, savingsOpportunities);
    const summary = this.buildSummary({
      healthScore,
      savingsOpportunities,
      overdueTotal: overdueReceivables.reduce((s, r) => s + r.valorPendente, 0),
      subscriptionDuplicates,
      moneyLeaks,
      negativeDays: cashflow.primeiraDataNegativa,
      goalsAtRisk: goalsAtRisk.length,
    });

    return {
      summary,
      risks,
      recommendations,
      actions,
      healthScore,
      savingsOpportunities,
      subscriptionDuplicates,
      moneyLeaks,
      spendingHealth,
      generatedAt: new Date().toISOString(),
    };
  }

  private async loadRecurringExpenses(userId: string): Promise<RecurringExpenseRow[]> {
    const rows = await this.prisma.lancamentoRecorrente.findMany({
      where: { userId, estaAtivo: true, tipo: "DESPESA" },
      select: {
        id: true,
        descricao: true,
        valor: true,
        cardId: true,
        financialAccountId: true,
        dataInicio: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      descricao: r.descricao,
      valor: Number(r.valor),
      cardId: r.cardId,
      financialAccountId: r.financialAccountId,
      dataInicio: r.dataInicio,
      createdAt: r.createdAt,
    }));
  }

  private estimateMonthsActive(rows: RecurringExpenseRow[], _since: Date): Map<string, number> {
    const map = new Map<string, number>();
    const now = new Date();
    for (const r of rows) {
      const start = r.dataInicio ?? r.createdAt ?? now;
      const months =
        (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (now.getUTCMonth() - start.getUTCMonth()) +
        1;
      map.set(r.id, Math.max(1, months));
    }
    return map;
  }

  private async loadExpenseTransactions(userId: string, since: Date) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: since },
      },
      select: { description: true, amount: true, date: true },
    });
    return rows.map((t) => ({
      description: t.description,
      amount: Math.abs(Number(t.amount)),
      monthKey: monthKey(t.date),
    }));
  }

  private toMonthlySpendPoints(
    transactions: Array<{ description: string; amount: number; monthKey: string }>,
    recurring: RecurringExpenseRow[],
  ): MonthlySpendPoint[] {
    const recurringByDesc = new Map(
      recurring.map((r) => [r.descricao.toLowerCase(), r.id]),
    );
    return transactions.map((t) => ({
      description: t.description,
      monthKey: t.monthKey,
      amount: t.amount,
      recurringId: recurringByDesc.get(t.description.toLowerCase()),
    }));
  }

  private buildRisks(
    alerts: FinancialAlertRecord[],
    primeiraDataNegativa: string | null,
    overdue: Array<{ descricao: string; valorPendente: number }>,
  ): AdvisorRisk[] {
    const risks: AdvisorRisk[] = [];

    for (const a of alerts.filter((x) => x.severity === "CRITICAL").slice(0, 5)) {
      risks.push({
        id: `risk-alert-${a.id}`,
        title: a.title,
        severity: "critical",
        description: a.description,
        source: "alertas_financeiros",
      });
    }

    for (const a of alerts.filter((x) => x.severity === "WARNING").slice(0, 3)) {
      risks.push({
        id: `risk-alert-w-${a.id}`,
        title: a.title,
        severity: "warning",
        description: a.description,
        source: "alertas_financeiros",
      });
    }

    if (primeiraDataNegativa) {
      risks.push({
        id: "risk-cashflow",
        title: "Fluxo de caixa negativo",
        severity: "critical",
        description: `Saldo projetado negativo a partir de ${primeiraDataNegativa}.`,
        source: "fluxo_caixa",
      });
    }

    if (overdue.length > 0) {
      const total = overdue.reduce((s, r) => s + r.valorPendente, 0);
      risks.push({
        id: "risk-receivables",
        title: "Recebíveis em atraso",
        severity: "warning",
        description: `${overdue.length} recebível(is) em atraso totalizando R$ ${total.toFixed(2)}.`,
        source: "contas_a_receber",
      });
    }

    return risks;
  }

  private buildRecommendations(
    actions: AdvisorConsultation["actions"],
    savings: AdvisorConsultation["savingsOpportunities"],
  ): string[] {
    const recs: string[] = [];
    for (const s of savings.slice(0, 3)) {
      recs.push(s.description);
    }
    for (const a of actions.slice(0, 5)) {
      if (!recs.includes(a.description)) recs.push(a.description);
    }
    return recs.slice(0, 8);
  }

  private buildSummary(input: {
    healthScore: AdvisorConsultation["healthScore"];
    savingsOpportunities: AdvisorConsultation["savingsOpportunities"];
    overdueTotal: number;
    subscriptionDuplicates: AdvisorConsultation["subscriptionDuplicates"];
    moneyLeaks: AdvisorConsultation["moneyLeaks"];
    negativeDays: string | null;
    goalsAtRisk: number;
  }): string {
    const parts: string[] = [];
    const totalSavings = input.savingsOpportunities.reduce(
      (s, o) => s + o.estimatedMonthlySavings,
      0,
    );
    if (totalSavings > 0) {
      parts.push(`Você pode economizar cerca de R$ ${totalSavings.toFixed(2)}/mês.`);
    }
    if (input.subscriptionDuplicates.length > 0) {
      parts.push(
        `Foi detectada assinatura duplicada (${input.subscriptionDuplicates[0].brand}).`,
      );
    }
    if (input.negativeDays) {
      const days = Math.max(
        0,
        Math.ceil(
          (new Date(`${input.negativeDays}T12:00:00.000Z`).getTime() - Date.now()) /
            (86400000),
        ),
      );
      parts.push(
        days > 0
          ? `Seu fluxo de caixa ficará negativo em aproximadamente ${days} dias.`
          : "Seu fluxo de caixa projetado está negativo.",
      );
    }
    if (input.overdueTotal > 0) {
      parts.push(`Existe recebível atrasado totalizando R$ ${input.overdueTotal.toFixed(2)}.`);
    }
    if (input.goalsAtRisk > 0) {
      parts.push(
        input.goalsAtRisk === 1
          ? "Sua meta financeira está em risco."
          : `${input.goalsAtRisk} metas financeiras estão em risco.`,
      );
    }
    const leak = input.moneyLeaks[0];
    if (leak) {
      parts.push(`Há R$ ${leak.monthlyTotal.toFixed(2)}/mês em gastos invisíveis recorrentes.`);
    }
    parts.push(
      `Score de saúde financeira: ${input.healthScore.score}/100 (${input.healthScore.classification}).`,
    );
    return parts.join(" ");
  }
}
