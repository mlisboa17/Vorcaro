import type { Prisma } from "@prisma/client";
import {
  addMonthsUtc,
  centsToDecimalString,
  decimalToCents,
  monthsBetweenUtc,
  startOfUtcDay,
} from "../../domain/money";

export type GoalStrategyInput = {
  valorObjetivo: Prisma.Decimal;
  valorAtual: Prisma.Decimal;
  aporteMensal: Prisma.Decimal | null;
  dataObjetivo: Date | null;
};

export type GoalStrategyResult = {
  mesesRestantes: number | null;
  dataEstimada: Date | null;
  aporteNecessarioCents: number | null;
  percentualConcluido: number;
  restanteCents: number;
};

export class FinancialGoalStrategyService {
  compute(input: GoalStrategyInput, referenceDate = new Date()): GoalStrategyResult {
    const objetivoCents = decimalToCents(input.valorObjetivo);
    const atualCents = decimalToCents(input.valorAtual);
    const restanteCents = Math.max(0, objetivoCents - atualCents);

    const percentualConcluido =
      objetivoCents > 0 ? Math.min(100, Math.round((atualCents / objetivoCents) * 100)) : 100;

    let mesesRestantes: number | null = null;
    let dataEstimada: Date | null = null;
    let aporteNecessarioCents: number | null = null;

    const aporteCents = input.aporteMensal ? decimalToCents(input.aporteMensal) : null;
    const today = startOfUtcDay(referenceDate);

    if (aporteCents && aporteCents > 0) {
      mesesRestantes = restanteCents <= 0 ? 0 : Math.ceil(restanteCents / aporteCents);
      dataEstimada =
        mesesRestantes === 0 ? today : addMonthsUtc(today, mesesRestantes);
    } else if (input.dataObjetivo) {
      const target = startOfUtcDay(input.dataObjetivo);
      mesesRestantes = target <= today ? 0 : Math.max(1, monthsBetweenUtc(today, target) || 1);
      dataEstimada = target;
      aporteNecessarioCents =
        restanteCents <= 0 ? 0 : Math.ceil(restanteCents / Math.max(1, mesesRestantes));
    }

    return {
      mesesRestantes,
      dataEstimada,
      aporteNecessarioCents,
      percentualConcluido,
      restanteCents,
    };
  }

  formatAporteNecessario(cents: number | null): string | null {
    return cents != null ? centsToDecimalString(cents) : null;
  }
}
