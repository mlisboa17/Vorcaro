import type { VorcaroAggregatedContext } from "./vorcaro-context-aggregator.service";

export class FinancialHealthConversationService {
  canAnswerDirectly(question: string): boolean {
    return /sa[uú]de financeira|como estou financeiramente|situa[cç][aã]o melhorou|afetando meu patrim[oô]nio|areas? merecem aten[cç][aã]o/i.test(
      question,
    );
  }

  buildDirectAnswer(context: VorcaroAggregatedContext, question: string): string | null {
    if (!this.canAnswerDirectly(question)) return null;

    const lines = [
      `**FATO** — Score de saúde financeira: ${context.healthScore}/100 (${context.healthClassification}).`,
      "",
      "**IMPACTO** —",
      context.summary,
      "",
      "**AÇÃO** —",
    ];

    if (context.criticalAlertCount > 0) {
      lines.push(
        `Priorize ${context.criticalAlertCount} alerta(s) crítico(s) e revise compromissos recorrentes hoje.`,
      );
    } else if (context.healthScore >= 70) {
      lines.push("Mantenha aportes e controle de vazamentos para consolidar patrimônio.");
    } else {
      lines.push("Revise fluxo de caixa, recebíveis atrasados e metas em risco esta semana.");
    }

    if (/melhorou/i.test(question)) {
      lines.push("", "Compare este score com o mês anterior no dashboard executivo para validar evolução.");
    }

    return lines.join("\n");
  }
}
