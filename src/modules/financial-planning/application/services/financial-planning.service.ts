import type { FinancialGoal, Prisma, PrismaClient } from "@prisma/client";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import { PrismaPatrimonyUnitOfWork } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony-unit-of-work";
import type { FinancialGoalComplete, PlanningSummary } from "@/types/financial-planning";
import { centsToDecimalString, decimalToCents, prismaDecimal } from "../../domain/money";
import { FinancialGoalPrioritizationService } from "./financial-goal-prioritization.service";
import { FinancialGoalProjectionService } from "./financial-goal-projection.service";
import { FinancialGoalRecommendationService } from "./financial-goal-recommendation.service";

export type CreateGoalInput = {
  nome: string;
  descricao?: string;
  tipo: FinancialGoal["tipo"];
  valorObjetivo: string;
  valorAtual?: string;
  aporteMensal?: string | null;
  dataObjetivo?: string | null;
  prioridade: FinancialGoal["prioridade"];
};

export type UpdateGoalInput = Partial<CreateGoalInput> & {
  status?: FinancialGoal["status"];
};

export class FinancialPlanningService {
  private readonly projectionService = new FinancialGoalProjectionService();
  private readonly prioritizationService = new FinancialGoalPrioritizationService();
  private readonly recommendationService: FinancialGoalRecommendationService;
  private readonly patrimonyUow: PrismaPatrimonyUnitOfWork;

  constructor(private readonly prisma: PrismaClient) {
    this.recommendationService = new FinancialGoalRecommendationService(prisma);
    this.patrimonyUow = new PrismaPatrimonyUnitOfWork(prisma);
  }

  /** Exportado para Telegram e outras integrações. */
  async getGoals(userId: string): Promise<FinancialGoalComplete[]> {
    const rows = await this.prisma.financialGoal.findMany({
      where: { userId, status: { not: "CANCELLED" } },
    });

    const sorted = this.prioritizationService.sort(rows);
    const [cashflow, patrimony] = await Promise.all([
      buildCashflowProjectionService(this.prisma).execute(userId),
      this.patrimonyUow.getSummary(userId),
    ]);

    const context = {
      cashflow,
      patrimonioLiquido: patrimony.patrimonioLiquido,
      totalPassivos: patrimony.totalPassivos,
      margemLivreMensal: centsToDecimalString(
        Math.max(0, Math.round((cashflow.previsao30Dias - cashflow.saldoAtual) * 100)),
      ),
    };

    return sorted.map((goal, index) =>
      this.serializeGoal(goal, cashflow, context, index + 1),
    );
  }

  async getGoalsWithSummary(userId: string) {
    const goals = await this.getGoals(userId);
    const recommendations = await this.recommendationService.recommendGlobal(userId);
    return {
      goals,
      summary: this.buildSummary(goals),
      recommendations,
    };
  }

  async getExecutivePlanningSnapshot(userId: string) {
    const goals = await this.getGoals(userId).then((list) =>
      list.filter((g) => g.status === "ACTIVE"),
    );
    const summary = this.buildSummary(goals);

    return {
      metasAtivas: summary.metasAtivas,
      percentualProgressoGlobal: summary.percentualProgressoGlobal,
      metaMaisProxima: summary.metaMaisProxima,
      metaMaisAtrasada: summary.metaMaisAtrasada,
      metaMaiorValor: summary.metaMaiorValor,
    };
  }

  async createGoal(userId: string, input: CreateGoalInput) {
    const row = await this.prisma.financialGoal.create({
      data: this.toPrismaData(userId, input),
    });
    const goals = await this.getGoals(userId);
    return goals.find((g) => g.id === row.id)!;
  }

  async updateGoal(userId: string, goalId: string, input: UpdateGoalInput) {
    await this.assertOwnership(userId, goalId);
    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: this.toPrismaUpdate(input),
    });
    const goals = await this.getGoals(userId);
    const goal = goals.find((g) => g.id === goalId)!;
    if (input.status === "ACHIEVED") {
      const { getVorcaroEntityStateChangedHandler } = await import("@/lib/api/vorcaro-followups");
      await getVorcaroEntityStateChangedHandler().onEntityStateChanged({
        userId,
        entityType: "GOAL",
        entityId: goalId,
        newStatus: "ACHIEVED",
      });
    }
    return goal;
  }

  async deleteGoal(userId: string, goalId: string) {
    await this.assertOwnership(userId, goalId);
    await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: { status: "CANCELLED" },
    });
    return { ok: true };
  }

  private async assertOwnership(userId: string, goalId: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) {
      throw new Error("GOAL_NOT_FOUND");
    }
  }

  private serializeGoal(
    goal: FinancialGoal,
    cashflow: Awaited<ReturnType<ReturnType<typeof buildCashflowProjectionService>["execute"]>>,
    context: {
      patrimonioLiquido: number;
      totalPassivos: number;
      margemLivreMensal: string;
      cashflow: typeof cashflow;
    },
    ordemPrioridade: number,
  ): FinancialGoalComplete {
    const input = {
      valorObjetivo: goal.valorObjetivo,
      valorAtual: goal.valorAtual,
      aporteMensal: goal.aporteMensal,
      dataObjetivo: goal.dataObjetivo,
    };

    const strategy = this.projectionService.computeStrategy(input);
    const viability = this.projectionService.evaluateViability(input, strategy, cashflow);
    const recomendacao = this.recommendationService.buildForGoal(goal, strategy, viability, {
      cashflow: context.cashflow,
      patrimonioLiquido: context.patrimonioLiquido,
      totalPassivos: context.totalPassivos,
      margemLivreMensal: context.margemLivreMensal,
    });

    return {
      id: goal.id,
      nome: goal.nome,
      descricao: goal.descricao,
      tipo: goal.tipo,
      valorObjetivo: goal.valorObjetivo.toFixed(2),
      valorAtual: goal.valorAtual.toFixed(2),
      aporteMensal: goal.aporteMensal?.toFixed(2) ?? null,
      dataObjetivo: goal.dataObjetivo?.toISOString() ?? null,
      prioridade: goal.prioridade,
      status: goal.status,
      ordemPrioridade,
      estrategia: {
        mesesRestantes: strategy.mesesRestantes,
        dataEstimada: strategy.dataEstimada?.toISOString() ?? null,
        aporteNecessario:
          strategy.aporteNecessarioCents != null
            ? centsToDecimalString(strategy.aporteNecessarioCents)
            : null,
        percentualConcluido: strategy.percentualConcluido,
      },
      viabilidade: {
        viavel: viability.viavel,
        risco: viability.risco,
        margemLivreMensal: viability.margemLivreMensal,
        percentualComprometimento: viability.percentualComprometimento,
        statusVisual: viability.statusVisual,
        atrasada: viability.atrasada,
      },
      recomendacao,
    };
  }

  private buildSummary(goals: FinancialGoalComplete[]): PlanningSummary {
    const active = goals.filter((g) => g.status === "ACTIVE");
    const totalPlanejadoCents = active.reduce((s, g) => s + decimalToCents(g.valorObjetivo), 0);
    const totalAtualCents = active.reduce((s, g) => s + decimalToCents(g.valorAtual), 0);
    const achieved = goals.filter((g) => g.status === "ACHIEVED").length;
    const taxaConclusaoGlobal =
      goals.length > 0 ? Math.round((achieved / goals.length) * 100) : 0;
    const percentualProgressoGlobal =
      totalPlanejadoCents > 0
        ? Math.min(100, Math.round((totalAtualCents / totalPlanejadoCents) * 100))
        : 0;

    const metaMaisProxima =
      [...active]
        .filter((g) => g.estrategia.percentualConcluido < 100)
        .sort(
          (a, b) => b.estrategia.percentualConcluido - a.estrategia.percentualConcluido,
        )[0] ?? null;

    const metaMaisAtrasada =
      active.find((g) => g.viabilidade.atrasada || g.viabilidade.statusVisual === "ATRASADA") ??
      null;

    const metaMaiorValor =
      active.length > 0
        ? active.reduce((best, g) =>
            decimalToCents(g.valorObjetivo) > decimalToCents(best.valorObjetivo) ? g : best,
          )
        : null;

    return {
      metasAtivas: active.length,
      valorTotalPlanejado: centsToDecimalString(totalPlanejadoCents),
      valorAcumulado: centsToDecimalString(totalAtualCents),
      taxaConclusaoGlobal,
      percentualProgressoGlobal,
      metaMaisProxima,
      metaMaisAtrasada,
      metaMaiorValor,
    };
  }

  private toPrismaData(userId: string, input: CreateGoalInput): Prisma.FinancialGoalCreateInput {
    return {
      user: { connect: { id: userId } },
      nome: input.nome,
      descricao: input.descricao,
      tipo: input.tipo,
      valorObjetivo: prismaDecimal(input.valorObjetivo),
      valorAtual: prismaDecimal(input.valorAtual ?? "0"),
      aporteMensal: input.aporteMensal ? prismaDecimal(input.aporteMensal) : null,
      dataObjetivo: input.dataObjetivo ? new Date(input.dataObjetivo) : null,
      prioridade: input.prioridade,
    };
  }

  private toPrismaUpdate(input: UpdateGoalInput): Prisma.FinancialGoalUpdateInput {
    const data: Prisma.FinancialGoalUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.descricao !== undefined) data.descricao = input.descricao;
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.valorObjetivo !== undefined) data.valorObjetivo = prismaDecimal(input.valorObjetivo);
    if (input.valorAtual !== undefined) data.valorAtual = prismaDecimal(input.valorAtual);
    if (input.aporteMensal !== undefined) {
      data.aporteMensal = input.aporteMensal ? prismaDecimal(input.aporteMensal) : null;
    }
    if (input.dataObjetivo !== undefined) {
      data.dataObjetivo = input.dataObjetivo ? new Date(input.dataObjetivo) : null;
    }
    if (input.prioridade !== undefined) data.prioridade = input.prioridade;
    if (input.status !== undefined) data.status = input.status;
    return data;
  }
}
