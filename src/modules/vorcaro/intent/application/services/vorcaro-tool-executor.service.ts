import type { PrismaClient } from "@prisma/client";
import { buildMonthlyCommitmentsUseCases } from "@/lib/api/monthly-commitments";
import { buildReceivableUseCases } from "@/lib/api/receivable-use-cases";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import type { AdvisorConsultation } from "@/modules/financial-consultant/domain/types/advisor-action";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";
import { FinancialAlertQueryService } from "@/modules/financial-alerts/application/services/financial-alert-query.service";
import { NotificationQueryService } from "@/modules/notifications/application/services/notification-query.service";
import { isReceivableOpenStatus } from "@/modules/receivables/domain/services/receivable.service";
import type { VorcaroIntent, VorcaroToolName, VorcaroToolResult } from "../../domain/types/vorcaro-intent";
import { FinancialTimelineTool } from "@/modules/financial-memory/application/tools/financial-timeline-tool";
import { FinancialEvolutionTool } from "@/modules/financial-memory/application/tools/financial-evolution-tool";
import { FinancialAchievementTool } from "@/modules/financial-memory/application/tools/financial-achievement-tool";
import { FinancialTrendTool } from "@/modules/financial-memory/application/tools/financial-trend-tool";
import { FinancialMemoryQueryService } from "@/modules/financial-memory/application/services/financial-memory-query.service";
import { RulesAutomationTool } from "../tools/rules-automation-tool";

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

const TOOL_TO_INTENT: Record<VorcaroToolName, VorcaroIntent> = {
  financial_health: "HEALTH_SCORE",
  financial_alerts: "ALERTS",
  receivables: "RECEIVABLES",
  financial_goals: "GOALS",
  cashflow_projection: "CASHFLOW",
  monthly_commitments: "COMMITMENTS",
  subscription_detector: "SUBSCRIPTIONS",
  money_leak_detector: "MONEY_LEAK",
  notification_query: "NOTIFICATIONS",
  spending_analysis: "EXPENSES",
  rules_automation: "RULES_AUTOMATIONS",
  financial_timeline: "TIMELINE",
  financial_evolution: "EVOLUTION",
  financial_achievements: "ACHIEVEMENTS",
  financial_trends: "TRENDS",
};

export class VorcaroToolExecutorService {
  private readonly consultant: IntelligentAdvisorService;
  private readonly alerts: FinancialAlertQueryService;
  private readonly notifications: NotificationQueryService;
  private readonly rulesTool: RulesAutomationTool;
  private readonly memoryQuery: FinancialMemoryQueryService;
  private readonly timelineTool: FinancialTimelineTool;
  private readonly evolutionTool: FinancialEvolutionTool;
  private readonly achievementTool: FinancialAchievementTool;
  private readonly trendTool: FinancialTrendTool;

  constructor(private readonly prisma: PrismaClient) {
    this.consultant = new IntelligentAdvisorService(prisma);
    this.alerts = new FinancialAlertQueryService(prisma);
    this.notifications = new NotificationQueryService(prisma);
    this.rulesTool = new RulesAutomationTool(prisma);
    this.memoryQuery = new FinancialMemoryQueryService(prisma);
    this.timelineTool = new FinancialTimelineTool(prisma);
    this.evolutionTool = new FinancialEvolutionTool(prisma);
    this.achievementTool = new FinancialAchievementTool(prisma);
    this.trendTool = new FinancialTrendTool(prisma);
  }

  async executeTool(
    userId: string,
    toolName: VorcaroToolName,
    consultation: AdvisorConsultation,
    question: string,
  ): Promise<VorcaroToolResult> {
    switch (toolName) {
      case "financial_health":
        return this.buildHealth(consultation);
      case "financial_alerts":
        return this.buildAlerts(userId, consultation);
      case "receivables":
        return this.buildReceivables(userId);
      case "financial_goals":
        return this.buildGoals(userId, consultation);
      case "cashflow_projection":
        return this.buildCashflow(userId, consultation);
      case "monthly_commitments":
        return this.buildCommitments(userId);
      case "subscription_detector":
        return this.buildSubscriptions(consultation);
      case "money_leak_detector":
        return this.buildMoneyLeak(consultation);
      case "notification_query":
        return this.buildNotifications(userId);
      case "spending_analysis":
        return this.buildSpending(consultation);
      case "rules_automation":
        return this.rulesTool.execute(userId, question);
      case "financial_timeline":
        return this.timelineTool.execute(userId);
      case "financial_evolution":
        return this.evolutionTool.execute(userId);
      case "financial_achievements":
        return this.achievementTool.execute(userId);
      case "financial_trends":
        return this.trendTool.execute(userId);
      default:
        return {
          intent: TOOL_TO_INTENT[toolName] ?? "UNKNOWN",
          title: "Consulta",
          summary: consultation.summary,
          facts: [],
          metrics: {},
          recommendations: consultation.recommendations.slice(0, 3),
        };
    }
  }

  async loadConsultation(userId: string): Promise<AdvisorConsultation> {
    return this.consultant.consult(userId);
  }

  private buildHealth(c: AdvisorConsultation): VorcaroToolResult {
    return {
      intent: "HEALTH_SCORE",
      title: "Saúde financeira",
      summary: `Score ${c.healthScore.score}/100 (${c.healthScore.classification}). ${c.summary}`,
      facts: c.healthScore.factors.slice(0, 5).map((f) => `${f.label}: impacto ${f.impact}`),
      metrics: {
        score: c.healthScore.score,
        classification: c.healthScore.classification,
      },
      recommendations: c.recommendations.slice(0, 3),
    };
  }

  private async buildAlerts(userId: string, c: AdvisorConsultation): Promise<VorcaroToolResult> {
    const [open, summary] = await Promise.all([
      this.alerts.list(userId, 1, 10, { status: "OPEN" }),
      this.alerts.summary(userId),
    ]);
    const critical = c.risks.filter((r) => r.severity === "critical");
    return {
      intent: "ALERTS",
      title: "Alertas financeiros",
      summary: `${summary.totalOpen} alerta(s) aberto(s), ${critical.length} risco(s) crítico(s).`,
      facts: [
        ...open.items.slice(0, 5).map((a) => `[${a.severity}] ${a.title}`),
        ...critical.slice(0, 3).map((r) => `Crítico: ${r.title}`),
      ],
      metrics: { open: summary.totalOpen, critical: critical.length },
      recommendations: critical.length > 0 ? ["Resolva alertas críticos hoje."] : ["Mantenha alertas revisados semanalmente."],
    };
  }

  private async buildReceivables(userId: string): Promise<VorcaroToolResult> {
    const receivables = await buildReceivableUseCases().list.execute(userId, false);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const overdue = receivables.filter(
      (r) => isReceivableOpenStatus(r.status) && r.expectedDate && r.expectedDate < today,
    );
    const totalPending = receivables
      .filter((r) => isReceivableOpenStatus(r.status))
      .reduce((s, r) => s + r.valorPendente, 0);

    return {
      intent: "RECEIVABLES",
      title: "Recebíveis",
      summary: `${overdue.length} recebível(is) atrasado(s), total pendente R$ ${totalPending.toFixed(2)}.`,
      facts: overdue.slice(0, 5).map((r) => `${r.descricao}: R$ ${r.valorPendente.toFixed(2)}`),
      metrics: { overdueCount: overdue.length, totalPending },
      recommendations:
        overdue.length > 0
          ? ["Priorize cobrança dos recebíveis atrasados esta semana."]
          : ["Mantenha previsão de recebíveis atualizada."],
    };
  }

  private async buildGoals(userId: string, c: AdvisorConsultation): Promise<VorcaroToolResult> {
    const goals = await new FinancialPlanningService(this.prisma).getGoals(userId);
    const atRisk = goals.filter(
      (g) =>
        g.status === "ACTIVE" &&
        (!g.viabilidade.viavel ||
          g.viabilidade.atrasada ||
          g.viabilidade.risco === "HIGH" ||
          g.viabilidade.statusVisual === "RISCO_ALTO" ||
          g.viabilidade.statusVisual === "ATRASADA"),
    );
    return {
      intent: "GOALS",
      title: "Metas financeiras",
      summary:
        atRisk.length > 0
          ? `${atRisk.length} meta(s) em risco ou atrasada(s).`
          : "Metas dentro do esperado ou sem metas ativas.",
      facts: atRisk.slice(0, 5).map((g) => g.nome),
      metrics: { atRisk: atRisk.length, total: goals.length },
      recommendations: c.recommendations.filter((r) => /meta/i.test(r)).slice(0, 3),
    };
  }

  private async buildCashflow(userId: string, c: AdvisorConsultation): Promise<VorcaroToolResult> {
    const projection = await buildCashflowProjectionService(this.prisma).execute(userId);
    const cashflowRisk = c.risks.find((r) => r.id === "risk-cashflow" || /caixa/i.test(r.title));
    const negativeAlert = projection.alertas.find((a) => a.tipo === "CAIXA_NEGATIVO");
    return {
      intent: "CASHFLOW",
      title: "Fluxo de caixa",
      summary:
        negativeAlert?.mensagem ??
        cashflowRisk?.description ??
        `Saldo atual R$ ${projection.saldoAtual.toFixed(2)}; projeção 30d R$ ${projection.previsao30Dias.toFixed(2)}.`,
      facts: [
        `Saldo atual: R$ ${projection.saldoAtual.toFixed(2)}`,
        `Projeção 30 dias: R$ ${projection.previsao30Dias.toFixed(2)}`,
        ...(projection.primeiraDataNegativa
          ? [`Primeira data negativa: ${projection.primeiraDataNegativa}`]
          : []),
        ...(cashflowRisk ? [`Risco: ${cashflowRisk.title}`] : []),
      ],
      metrics: {
        saldoAtual: projection.saldoAtual,
        previsao30Dias: projection.previsao30Dias,
        primeiraDataNegativa: projection.primeiraDataNegativa,
      },
      recommendations: negativeAlert || cashflowRisk ? ["Revise compromissos e recebíveis do próximo mês."] : [],
    };
  }

  private async buildCommitments(userId: string): Promise<VorcaroToolResult> {
    const data = await buildMonthlyCommitmentsUseCases().getMonthly(userId, monthKey(new Date()));
    return {
      intent: "COMMITMENTS",
      title: "Compromissos mensais",
      summary: `Compromissos do mês: R$ ${data.totalOutflows.toFixed(2)} em saídas.`,
      facts: data.items.slice(0, 5).map((i) => `${i.descricao}: R$ ${i.valor.toFixed(2)}`),
      metrics: { totalOutflows: data.totalOutflows, itemCount: data.items.length },
      recommendations:
        data.totalOutflows > 0 ? ["Revise recorrentes e parcelamentos antes de fechar o mês."] : [],
    };
  }

  private buildSubscriptions(c: AdvisorConsultation): VorcaroToolResult {
    const dupes = c.subscriptionDuplicates;
    const saving = dupes.reduce((s, d) => s + d.potentialMonthlySaving, 0);
    return {
      intent: "SUBSCRIPTIONS",
      title: "Assinaturas",
      summary:
        dupes.length > 0
          ? `${dupes.length} possível(is) duplicidade(s), economia ~R$ ${saving.toFixed(2)}/mês.`
          : "Nenhuma duplicidade evidente de assinaturas.",
      facts: dupes.slice(0, 5).map((d) => `${d.brand}: R$ ${d.monthlyTotal.toFixed(2)}/mês`),
      metrics: { duplicates: dupes.length, potentialSaving: saving },
      recommendations: dupes.length > 0 ? ["Revise assinaturas duplicadas para cancelamento."] : [],
    };
  }

  private buildMoneyLeak(c: AdvisorConsultation): VorcaroToolResult {
    const leaks = c.moneyLeaks;
    const total = leaks.reduce((s, l) => s + l.monthlyTotal, 0);
    return {
      intent: "MONEY_LEAK",
      title: "Vazamentos de dinheiro",
      summary:
        leaks.length > 0
          ? `${leaks.length} vazamento(s) detectado(s), ~R$ ${total.toFixed(2)}/mês.`
          : "Nenhum vazamento relevante detectado.",
      facts: leaks.slice(0, 5).map((l) => `${l.label}: R$ ${l.monthlyTotal.toFixed(2)}/mês`),
      metrics: { leakCount: leaks.length, monthlyTotal: total },
      recommendations: leaks.length > 0 ? ["Ataque os maiores vazamentos primeiro."] : [],
    };
  }

  private async buildNotifications(userId: string): Promise<VorcaroToolResult> {
    const [summary, list] = await Promise.all([
      this.notifications.getSummary(userId),
      this.notifications.list({ userId, page: 1, pageSize: 5, status: ["PENDING", "SENT"] }),
    ]);
    return {
      intent: "NOTIFICATIONS",
      title: "Notificações",
      summary: `${summary.unreadCount} notificação(ões) não lida(s).`,
      facts: list.items.slice(0, 5).map((n) => n.title),
      metrics: { unread: summary.unreadCount },
      recommendations: summary.unreadCount > 0 ? ["Revise a central de notificações."] : [],
    };
  }

  private buildSpending(c: AdvisorConsultation): VorcaroToolResult {
    const top = [...c.spendingHealth].sort((a, b) => b.monthlyAmount - a.monthlyAmount).slice(0, 5);
    return {
      intent: "EXPENSES",
      title: "Análise de gastos",
      summary: top.length > 0 ? `Maior gasto: ${top[0].label} (R$ ${top[0].monthlyAmount.toFixed(2)}).` : c.summary,
      facts: top.map((s) => `${s.label}: R$ ${s.monthlyAmount.toFixed(2)} (${s.percentOfIncome.toFixed(1)}% da renda)`),
      metrics: { categories: top.length },
      recommendations: c.recommendations.filter((r) => /gast/i.test(r)).slice(0, 3),
    };
  }

  async ensureMemoryRefreshed(userId: string): Promise<void> {
    await this.memoryQuery.refresh(userId);
  }
}
