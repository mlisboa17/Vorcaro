import type { PrismaClient, FinancialGoal } from "@prisma/client";
import type { CashFlowProjectionDTO } from "@/types/cashflow";
import type { GoalLayerRecommendation } from "@/types/financial-planning";
import { centsToDecimalString, decimalToCents } from "../../domain/money";
import type { GoalStrategyResult } from "./financial-goal-strategy.service";
import type { GoalViabilityResult } from "./financial-goal-viability.service";

export type GoalRecommendationGlobal = {
  tipo: FinancialGoal["tipo"];
  titulo: string;
  mensagem: string;
  prioridadeSugerida: FinancialGoal["prioridade"];
  valorSugerido?: string;
};

export type PlanningRecommendationContext = {
  cashflow: CashFlowProjectionDTO;
  patrimonioLiquido: number;
  totalPassivos: number;
  margemLivreMensal: string;
};

export class FinancialGoalRecommendationService {
  constructor(private readonly prisma: PrismaClient) {}

  async recommendGlobal(userId: string): Promise<GoalRecommendationGlobal[]> {
    const recommendations: GoalRecommendationGlobal[] = [];

    const hasEmergency = await this.prisma.financialGoal.findFirst({
      where: { userId, tipo: "EMERGENCY_FUND", status: "ACTIVE" },
    });

    if (!hasEmergency) {
      const avgExpenseCents = await this.getAverageMonthlyExpenseCents(userId);
      if (avgExpenseCents > 0) {
        recommendations.push({
          tipo: "EMERGENCY_FUND",
          titulo: "Reserva de emergência",
          mensagem:
            "Você ainda não possui meta de reserva de emergência. O padrão recomendado é 6× suas despesas médias mensais.",
          prioridadeSugerida: "HIGH",
          valorSugerido: centsToDecimalString(avgExpenseCents * 6),
        });
      }
    }

    const liabilities = await this.prisma.patrimonyLiability.findMany({
      where: { userId, estaAtivo: true },
      select: { saldoAtual: true, taxaJuros: true },
    });

    const withInterest = liabilities.filter(
      (l) => l.taxaJuros != null && l.taxaJuros.toNumber() > 0,
    );

    if (withInterest.length > 0) {
      const totalDebt = withInterest.reduce((s, l) => s + decimalToCents(l.saldoAtual), 0);
      recommendations.push({
        tipo: "DEBT_SETTLEMENT",
        titulo: "Quitação de passivos com juros",
        mensagem: `Existem ${withInterest.length} passivo(s) com juros ativos. Vale mais priorizar quitação do que novas metas de consumo.`,
        prioridadeSugerida: "HIGH",
        valorSugerido: centsToDecimalString(totalDebt),
      });
    }

    return recommendations;
  }

  buildForGoal(
    goal: Pick<
      FinancialGoal,
      "nome" | "tipo" | "valorObjetivo" | "valorAtual" | "aporteMensal" | "status"
    >,
    strategy: GoalStrategyResult,
    viability: GoalViabilityResult,
    context: PlanningRecommendationContext,
  ): GoalLayerRecommendation {
    const explicabilidade = [
      `Fluxo livre médio (30d): R$ ${context.margemLivreMensal}`,
      `Patrimônio líquido: R$ ${context.patrimonioLiquido.toFixed(2)}`,
      `Passivos totais: R$ ${context.totalPassivos.toFixed(2)}`,
      `Meta "${goal.nome}": R$ ${goal.valorAtual.toFixed(2)} de R$ ${goal.valorObjetivo.toFixed(2)}`,
    ];

    if (goal.status === "ACHIEVED") {
      return {
        titulo: "Meta concluída",
        mensagem: `Parabéns — você atingiu a meta "${goal.nome}". Considere realocar o aporte mensal para a próxima prioridade.`,
        explicabilidade,
      };
    }

    if (goal.status === "CANCELLED") {
      return {
        titulo: "Meta cancelada",
        mensagem: `A meta "${goal.nome}" foi cancelada e não entra mais no plano ativo.`,
        explicabilidade,
      };
    }

    const aporteCents =
      goal.aporteMensal != null
        ? decimalToCents(goal.aporteMensal)
        : strategy.aporteNecessarioCents ?? 0;
    const aporteLabel = centsToDecimalString(aporteCents);

    let mensagem: string;
    if (strategy.restanteCents <= 0) {
      mensagem = `A meta "${goal.nome}" já foi atingida com o valor acumulado atual.`;
    } else if (strategy.mesesRestantes != null && aporteCents > 0) {
      mensagem = `Mantendo o aporte de R$ ${aporteLabel} por mês, você deve atingir "${goal.nome}" em aproximadamente ${strategy.mesesRestantes} meses.`;
    } else if (strategy.aporteNecessarioCents != null) {
      mensagem = `Para cumprir a data alvo de "${goal.nome}", o aporte necessário é de cerca de R$ ${centsToDecimalString(strategy.aporteNecessarioCents)} por mês.`;
    } else {
      mensagem = `Defina um aporte mensal ou uma data objetivo para "${goal.nome}" e o Vorcaro calculará a estratégia completa.`;
    }

    if (viability.viavel && viability.risco === "LOW") {
      mensagem += " Pelo fluxo de caixa atual, essa estratégia parece sustentável sem comprometer suas despesas recorrentes.";
    } else if (viability.viavel && viability.risco === "MEDIUM") {
      mensagem += ` Atenção: o aporte consumiria cerca de ${viability.percentualComprometimento}% da sua margem livre mensal.`;
    } else if (!viability.viavel) {
      mensagem += ` O aporte planejado supera a margem livre de R$ ${viability.margemLivreMensal} — considere reduzir a meta, estender o prazo ou aumentar receitas.`;
    }

    if (viability.atrasada) {
      mensagem += " Esta meta está atrasada em relação ao prazo definido.";
    }

    const otimizacao = this.buildOptimization(strategy, viability, aporteCents);

    return {
      titulo: viability.viavel ? "Caminho recomendado" : "Ajuste necessário",
      mensagem,
      explicabilidade,
      otimizacao,
    };
  }

  private buildOptimization(
    strategy: GoalStrategyResult,
    viability: GoalViabilityResult,
    aporteCents: number,
  ): GoalLayerRecommendation["otimizacao"] {
    if (!viability.viavel || strategy.restanteCents <= 0 || !strategy.mesesRestantes) {
      return undefined;
    }

    const margemCents = decimalToCents(viability.margemLivreMensal);
    const livreAposAporte = margemCents - aporteCents;
    if (livreAposAporte < 10_000) return undefined;

    const aporteExtraCents = Math.min(livreAposAporte, Math.max(10_000, Math.round(livreAposAporte * 0.35)));
    const mesesAtual = strategy.mesesRestantes;
    const mesesNovo = Math.ceil(strategy.restanteCents / (aporteCents + aporteExtraCents));
    const mesesAntecipados = Math.max(0, mesesAtual - mesesNovo);

    if (mesesAntecipados < 1) return undefined;

    return {
      aporteExtraMensal: centsToDecimalString(aporteExtraCents),
      mesesAntecipados,
      mensagem: `Você possui aproximadamente R$ ${centsToDecimalString(livreAposAporte)} livres por mês. Se aumentar seu aporte em R$ ${centsToDecimalString(aporteExtraCents)} mensais, poderá antecipar esta meta em cerca de ${mesesAntecipados} meses.`,
    };
  }

  private async getAverageMonthlyExpenseCents(userId: string): Promise<number> {
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 3);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: since } },
      select: { amount: true, date: true },
    });

    if (transactions.length === 0) return 0;

    const byMonth = new Map<string, number>();
    for (const tx of transactions) {
      const key = `${tx.date.getUTCFullYear()}-${tx.date.getUTCMonth()}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + decimalToCents(tx.amount));
    }

    const totals = [...byMonth.values()];
    return Math.round(totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length));
  }
}
