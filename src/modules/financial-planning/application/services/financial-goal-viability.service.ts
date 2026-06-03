import type { Prisma } from "@prisma/client";
import type { CashFlowProjectionDTO } from "@/types/cashflow";
import type { GoalRiskLevel, GoalVisualStatus } from "@/types/financial-planning";
import { centsToDecimalString, decimalToCents, startOfUtcDay } from "../../domain/money";
import type { GoalStrategyResult } from "./financial-goal-strategy.service";

export type GoalViabilityInput = {
  aporteMensal: Prisma.Decimal | null;
  dataObjetivo: Date | null;
};

export type GoalViabilityResult = {
  viavel: boolean;
  risco: GoalRiskLevel;
  margemLivreMensal: string;
  percentualComprometimento: number;
  statusVisual: GoalVisualStatus;
  atrasada: boolean;
};

export class FinancialGoalViabilityService {
  evaluate(
    goal: GoalViabilityInput,
    strategy: GoalStrategyResult,
    cashflow: CashFlowProjectionDTO,
    referenceDate = new Date(),
  ): GoalViabilityResult {
    const margemCents = this.estimateMargemLivreCents(cashflow);
    const aporteCents =
      goal.aporteMensal != null
        ? decimalToCents(goal.aporteMensal)
        : strategy.aporteNecessarioCents ?? 0;

    const atrasada = this.isAtrasada(goal, strategy, referenceDate);

    if (strategy.restanteCents <= 0) {
      return {
        viavel: true,
        risco: "LOW",
        margemLivreMensal: centsToDecimalString(Math.max(0, margemCents)),
        percentualComprometimento: 0,
        statusVisual: "VIAVEL",
        atrasada: false,
      };
    }

    if (aporteCents <= 0) {
      return {
        viavel: true,
        risco: "LOW",
        margemLivreMensal: centsToDecimalString(Math.max(0, margemCents)),
        percentualComprometimento: 0,
        statusVisual: atrasada ? "ATRASADA" : "VIAVEL",
        atrasada,
      };
    }

    const percentualComprometimento =
      margemCents > 0
        ? Math.round((aporteCents / margemCents) * 100)
        : aporteCents > 0
          ? 100
          : 0;

    if (aporteCents > margemCents) {
      return {
        viavel: false,
        risco: "HIGH",
        margemLivreMensal: centsToDecimalString(Math.max(0, margemCents)),
        percentualComprometimento,
        statusVisual: atrasada ? "ATRASADA" : "RISCO_ALTO",
        atrasada,
      };
    }

    if (percentualComprometimento > 80) {
      return {
        viavel: true,
        risco: "MEDIUM",
        margemLivreMensal: centsToDecimalString(Math.max(0, margemCents)),
        percentualComprometimento,
        statusVisual: atrasada ? "ATRASADA" : "ATENCAO",
        atrasada,
      };
    }

    return {
      viavel: true,
      risco: "LOW",
      margemLivreMensal: centsToDecimalString(Math.max(0, margemCents)),
      percentualComprometimento,
      statusVisual: atrasada ? "ATRASADA" : "VIAVEL",
      atrasada,
    };
  }

  private estimateMargemLivreCents(cashflow: CashFlowProjectionDTO): number {
    const delta30Cents = Math.round((cashflow.previsao30Dias - cashflow.saldoAtual) * 100);
    return Math.max(0, delta30Cents);
  }

  private isAtrasada(
    goal: GoalViabilityInput,
    strategy: GoalStrategyResult,
    referenceDate: Date,
  ): boolean {
    if (strategy.restanteCents <= 0) return false;
    const today = startOfUtcDay(referenceDate);
    const deadline = goal.dataObjetivo
      ? startOfUtcDay(goal.dataObjetivo)
      : strategy.dataEstimada
        ? startOfUtcDay(strategy.dataEstimada)
        : null;
    return deadline != null && today > deadline;
  }
}
