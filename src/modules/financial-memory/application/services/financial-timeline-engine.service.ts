import type { PrismaClient } from "@prisma/client";
import { buildPatrimonyUseCases } from "@/lib/api/patrimony-use-cases";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { MonthFinancialOverviewService } from "@/modules/executive-dashboard/application/services/month-financial-overview.service";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";
import type { TimelineEngineRunStats } from "../../domain/types/financial-memory";
import {
  buildTimelineFingerprint,
  monthPeriodKey,
  percentChange,
  quarterPeriodKey,
} from "../../domain/services/timeline-fingerprint";
import { PrismaFinancialMemoryRepository } from "../../infrastructure/repositories/prisma-financial-memory.repository";
import { FinancialAchievementService } from "./financial-achievement.service";
import { financialMemoryObservability } from "./financial-memory-observability.service";

export class FinancialTimelineEngineService {
  private readonly repo: PrismaFinancialMemoryRepository;
  private readonly consultant: IntelligentAdvisorService;
  private readonly achievements: FinancialAchievementService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialMemoryRepository(prisma);
    this.consultant = new IntelligentAdvisorService(prisma);
    this.achievements = new FinancialAchievementService(prisma);
  }

  async runForUser(userId: string, referenceDate = new Date()): Promise<TimelineEngineRunStats> {
    const started = Date.now();
    let eventsCreated = 0;
    let achievementsUnlocked = 0;

    const consultation = await this.consultant.consult(userId);
    const patrimony = await buildPatrimonyUseCases().getSummary.execute(userId);
    const monthNow = await new MonthFinancialOverviewService(this.prisma).getCurrentMonth(
      userId,
      referenceDate,
    );
    const prevMonth = await new MonthFinancialOverviewService(this.prisma).getCurrentMonth(
      userId,
      new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1),
    );
    const goals = await new FinancialPlanningService(this.prisma).getGoals(userId);
    const goalsAtRisk = goals.filter(
      (g) =>
        g.status === "ACTIVE" &&
        (!g.viabilidade.viavel ||
          g.viabilidade.risco === "HIGH" ||
          g.viabilidade.statusVisual === "RISCO_ALTO"),
    ).length;
    const goalsAchieved = goals.filter((g) => g.status === "ACHIEVED").length;

    const netWorth = patrimony.patrimonioLiquido;
    const totalDebt = patrimony.totalPassivos;
    const healthScore = consultation.healthScore.score;

    const snapResult = await this.repo.upsertDailySnapshot({
      userId,
      snapshotDate: referenceDate,
      healthScore,
      netWorth,
      totalDebt,
      monthlyIncome: monthNow.receitas,
      monthlyExpenses: monthNow.despesasDre,
      monthlyCashflow: monthNow.saldoMes,
    });

    const snapshot30 = await this.repo.findSnapshotOnOrBefore(
      userId,
      new Date(referenceDate.getTime() - 30 * 86400000),
    );

    eventsCreated += await this.evaluateNetWorth(userId, netWorth, snapshot30, referenceDate);
    eventsCreated += await this.evaluateCashflow(
      userId,
      monthNow.saldoMes,
      prevMonth.saldoMes,
      referenceDate,
    );
    eventsCreated += await this.evaluateDebt(userId, totalDebt, snapshot30, referenceDate);
    eventsCreated += await this.evaluateGoals(userId, goals, goalsAtRisk, referenceDate);
    eventsCreated += await this.evaluateMoneyLeaks(
      userId,
      consultation.moneyLeaks.length,
      snapshot30,
      referenceDate,
    );
    eventsCreated += await this.evaluateSpending(
      userId,
      monthNow.despesasDre,
      prevMonth.despesasDre,
      referenceDate,
    );

    const since30 = new Date(referenceDate.getTime() - 30 * 86400000);
    const goalsAchievedRecently = await this.repo.countGoalsAchievedSince(userId, since30);

    achievementsUnlocked = await this.achievements.evaluateAfterEngineRun(userId, {
      healthScore,
      netWorth,
      monthlyExpenses: monthNow.despesasDre,
      moneyLeakCount: consultation.moneyLeaks.length,
      goalsAchievedRecently,
    });

    return {
      userId,
      snapshotsRecorded: snapResult.created ? 1 : 0,
      eventsCreated,
      achievementsUnlocked,
      durationMs: Date.now() - started,
    };
  }

  async runForAllUsers(): Promise<{ users: number; totalEvents: number }> {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    let totalEvents = 0;
    for (const u of users) {
      const stats = await this.runForUser(u.id);
      totalEvents += stats.eventsCreated;
    }
    return { users: users.length, totalEvents };
  }

  private async evaluateNetWorth(
    userId: string,
    current: number,
    past: { netWorth: number } | null,
    ref: Date,
  ): Promise<number> {
    if (!past || past.netWorth === 0) return 0;
    const pct = percentChange(current, past.netWorth);
    if (pct == null) return 0;
    let created = 0;
    if (pct >= 10) {
      const fp = buildTimelineFingerprint(userId, "NET_WORTH_INCREASE", monthPeriodKey(ref));
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "NET_WORTH_INCREASE",
        title: "Patrimônio em alta",
        description: `Patrimônio líquido cresceu ${pct.toFixed(1)}% em relação ao registro de 30 dias atrás.`,
        eventDate: ref,
        impactLevel: pct >= 20 ? "HIGH" : "MEDIUM",
        fingerprint: fp,
        metadata: { percentChange: pct, current, past: past.netWorth },
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    } else if (pct <= -10) {
      const fp = buildTimelineFingerprint(userId, "NET_WORTH_DECREASE", monthPeriodKey(ref));
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "NET_WORTH_DECREASE",
        title: "Patrimônio em queda",
        description: `Patrimônio líquido caiu ${Math.abs(pct).toFixed(1)}% em 30 dias.`,
        eventDate: ref,
        impactLevel: pct <= -20 ? "HIGH" : "MEDIUM",
        fingerprint: fp,
        metadata: { percentChange: pct },
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }
    return created;
  }

  private async evaluateCashflow(
    userId: string,
    current: number,
    previous: number,
    ref: Date,
  ): Promise<number> {
    let created = 0;
    const period = monthPeriodKey(ref);
    if (current > 0 && previous > 0) {
      const fp = buildTimelineFingerprint(userId, "CASHFLOW_IMPROVEMENT", period);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "CASHFLOW_IMPROVEMENT",
        title: "Fluxo de caixa consistente",
        description: "Saldo mensal positivo por dois meses consecutivos.",
        eventDate: ref,
        impactLevel: "MEDIUM",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    } else if (current < 0 && previous < 0 && current < previous) {
      const fp = buildTimelineFingerprint(userId, "CASHFLOW_DETERIORATION", period);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "CASHFLOW_DETERIORATION",
        title: "Fluxo de caixa deteriorando",
        description: "Saldo mensal negativo e piorando em relação ao mês anterior.",
        eventDate: ref,
        impactLevel: "HIGH",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }
    return created;
  }

  private async evaluateDebt(
    userId: string,
    current: number,
    past: { totalDebt: number } | null,
    ref: Date,
  ): Promise<number> {
    if (!past || past.totalDebt === 0) return 0;
    const pct = percentChange(current, past.totalDebt);
    if (pct == null) return 0;
    let created = 0;
    if (pct <= -5) {
      const fp = buildTimelineFingerprint(userId, "DEBT_REDUCTION", monthPeriodKey(ref));
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "DEBT_REDUCTION",
        title: "Dívida reduzida",
        description: `Passivos totais caíram ${Math.abs(pct).toFixed(1)}% em 30 dias.`,
        eventDate: ref,
        impactLevel: "MEDIUM",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    } else if (pct >= 5) {
      const fp = buildTimelineFingerprint(userId, "DEBT_INCREASE", monthPeriodKey(ref));
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "DEBT_INCREASE",
        title: "Dívida aumentou",
        description: `Passivos totais subiram ${pct.toFixed(1)}% em 30 dias.`,
        eventDate: ref,
        impactLevel: "HIGH",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }
    return created;
  }

  private async evaluateGoals(
    userId: string,
    goals: Awaited<ReturnType<FinancialPlanningService["getGoals"]>>,
    atRisk: number,
    ref: Date,
  ): Promise<number> {
    let created = 0;
    const month = monthPeriodKey(ref);

    for (const g of goals.filter((goal) => goal.status === "ACHIEVED")) {
      const fp = buildTimelineFingerprint(userId, "GOAL_COMPLETED", g.id);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "GOAL_COMPLETED",
        title: `Meta concluída: ${g.nome}`,
        description: `A meta "${g.nome}" foi alcançada.`,
        eventDate: ref,
        impactLevel: "HIGH",
        fingerprint: fp,
        metadata: { goalId: g.id },
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }

    if (atRisk > 0) {
      const fp = buildTimelineFingerprint(userId, "GOAL_AT_RISK", month);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "GOAL_AT_RISK",
        title: "Metas em risco",
        description: `${atRisk} meta(s) ativa(s) com indicadores de risco.`,
        eventDate: ref,
        impactLevel: atRisk >= 2 ? "HIGH" : "MEDIUM",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }

    const progressing = goals.filter((g) => {
      if (g.status !== "ACTIVE" || !g.viabilidade.viavel) return false;
      const atual = typeof g.valorAtual === "number" ? g.valorAtual : Number(g.valorAtual);
      return atual > 0;
    });
    if (progressing.length > 0) {
      const fp = buildTimelineFingerprint(userId, "GOAL_PROGRESS", month);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "GOAL_PROGRESS",
        title: "Progresso em metas",
        description: `${progressing.length} meta(s) com aportes em andamento.`,
        eventDate: ref,
        impactLevel: "LOW",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }

    return created;
  }

  private async evaluateMoneyLeaks(
    userId: string,
    leakCount: number,
    past: { healthScore: number } | null,
    ref: Date,
  ): Promise<number> {
    let created = 0;
    if (leakCount > 0) {
      const fp = buildTimelineFingerprint(userId, "MONEY_LEAK_DETECTED", monthPeriodKey(ref));
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "MONEY_LEAK_DETECTED",
        title: "Vazamentos detectados",
        description: `${leakCount} padrão(ões) de gasto recorrente identificado(s) como vazamento.`,
        eventDate: ref,
        impactLevel: leakCount >= 3 ? "HIGH" : "MEDIUM",
        fingerprint: fp,
        metadata: { count: leakCount },
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }
    return created;
  }

  private async evaluateSpending(
    userId: string,
    current: number,
    previous: number,
    ref: Date,
  ): Promise<number> {
    if (previous <= 0) return 0;
    const pct = percentChange(current, previous);
    if (pct == null) return 0;
    let created = 0;
    const quarter = quarterPeriodKey(ref);
    if (pct <= -8) {
      const fp = buildTimelineFingerprint(userId, "SPENDING_REDUCTION", `MONTHLY:${quarter}`);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "SPENDING_REDUCTION",
        title: "Gastos reduzidos",
        description: `Despesas do mês caíram ${Math.abs(pct).toFixed(1)}% vs. mês anterior.`,
        eventDate: ref,
        impactLevel: "MEDIUM",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    } else if (pct >= 15) {
      const fp = buildTimelineFingerprint(userId, "SPENDING_INCREASE", `MONTHLY:${quarter}`);
      const r = await this.repo.upsertTimelineEvent({
        userId,
        eventType: "SPENDING_INCREASE",
        title: "Gastos em alta",
        description: `Despesas do mês subiram ${pct.toFixed(1)}% vs. mês anterior.`,
        eventDate: ref,
        impactLevel: "MEDIUM",
        fingerprint: fp,
      });
      if (r.created) {
        created += 1;
        financialMemoryObservability.recordTimelineEventsCreated();
      }
    }
    return created;
  }
}
