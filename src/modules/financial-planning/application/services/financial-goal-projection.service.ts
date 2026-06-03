import type { CashFlowProjectionDTO } from "@/types/cashflow";
import {
  FinancialGoalStrategyService,
  type GoalStrategyInput,
  type GoalStrategyResult,
} from "./financial-goal-strategy.service";
import {
  FinancialGoalViabilityService,
  type GoalViabilityResult,
} from "./financial-goal-viability.service";

/** Orquestra estratégia + viabilidade (compatibilidade e testes legados). */
export class FinancialGoalProjectionService {
  private readonly strategyService = new FinancialGoalStrategyService();
  private readonly viabilityService = new FinancialGoalViabilityService();

  computeStrategy(input: GoalStrategyInput, referenceDate?: Date): GoalStrategyResult {
    return this.strategyService.compute(input, referenceDate);
  }

  evaluateViability(
    goal: GoalStrategyInput,
    strategy: GoalStrategyResult,
    cashflow: CashFlowProjectionDTO,
    referenceDate?: Date,
  ): GoalViabilityResult {
    return this.viabilityService.evaluate(goal, strategy, cashflow, referenceDate);
  }

  project(goal: GoalStrategyInput, cashflow: CashFlowProjectionDTO, referenceDate = new Date()) {
    const strategy = this.strategyService.compute(goal, referenceDate);
    const viabilidade = this.viabilityService.evaluate(goal, strategy, cashflow, referenceDate);

    return {
      ...strategy,
      percentualConclusao: strategy.percentualConcluido,
      aporteNecessarioCents: strategy.aporteNecessarioCents,
      viabilidade: {
        viavel: viabilidade.viavel,
        fluxoInsuficiente: !viabilidade.viavel,
        margemDisponivelMensal: viabilidade.margemLivreMensal,
        statusVisual: viabilidade.statusVisual,
        risco: viabilidade.risco,
        percentualComprometimento: viabilidade.percentualComprometimento,
        atrasada: viabilidade.atrasada,
      },
    };
  }
}

export type GoalProjectionResult = ReturnType<FinancialGoalProjectionService["project"]>;
