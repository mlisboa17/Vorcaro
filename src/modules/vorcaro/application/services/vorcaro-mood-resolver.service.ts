import type { ResolvedVorcaroMood, VorcaroMood, VorcaroMoodContext } from "../../domain/types/vorcaro-mood";

export class VorcaroMoodResolverService {
  resolve(context: VorcaroMoodContext): ResolvedVorcaroMood {
    if (context.debtRecentlyPaid || context.positiveGoalProgress) {
      return {
        mood: "CELEBRATING",
        hint: context.debtRecentlyPaid
          ? "Dívida quitada. Finalmente uma linha deste relatório que não me dá trabalho. Bom trabalho."
          : "Evolução positiva detectada. Continue consolidando patrimônio.",
      };
    }

    const days = context.negativeCashflowDays;
    if (
      days != null &&
      days <= 14 &&
      (context.criticalAlertCount ?? 0) > 0
    ) {
      return {
        mood: "CONCERNED",
        hint:
          days > 0
            ? `Seu fluxo ficará negativo em ${days} dias. Vamos resolver isso primeiro.`
            : "Seu fluxo projetado está negativo. Vamos agir antes que isso aconteça.",
      };
    }

    if ((context.overdueReceivableAmount ?? 0) > 0 || (context.goalsAtRisk ?? 0) > 0) {
      return {
        mood: "CONCERNED",
        hint:
          (context.overdueReceivableAmount ?? 0) > 0
            ? "Capital temporariamente fora do seu fluxo. Priorize recuperação."
            : "Meta financeira sob pressão. Ajuste aportes ou prazo.",
      };
    }

    if ((context.savingsOpportunityMonthly ?? 0) > 0) {
      return {
        mood: "FOCUSED",
        hint: "Detectei uma oportunidade concreta de melhorar seu fluxo de caixa.",
      };
    }

    return { mood: "NORMAL" };
  }

  moodInstruction(mood: VorcaroMood, hint?: string): string | undefined {
    if (mood === "NORMAL") return undefined;
    const base = `Modo Vorcaro: ${mood}.`;
    return hint ? `${base} Contexto: ${hint}` : base;
  }
}
