import type {
  FinancialHealthClassification,
  FinancialHealthScore,
  MoneyLeakFinding,
  SubscriptionDuplicateFinding,
} from "../../domain/types/advisor-action";

export type HealthScoreInput = {
  criticalAlerts: number;
  warningAlerts: number;
  commitmentPercent: number;
  goalsAtRisk: number;
  overdueReceivableAmount: number;
  subscriptionDuplicates: SubscriptionDuplicateFinding[];
  moneyLeaks: MoneyLeakFinding[];
};

export class FinancialHealthScoreService {
  compute(input: HealthScoreInput): FinancialHealthScore {
    let score = 100;
    const factors: FinancialHealthScore["factors"] = [];

    if (input.criticalAlerts > 0) {
      const impact = Math.min(30, input.criticalAlerts * 12);
      score -= impact;
      factors.push({ label: `${input.criticalAlerts} alerta(s) crítico(s)`, impact: -impact });
    }

    if (input.warningAlerts > 0) {
      const impact = Math.min(15, input.warningAlerts * 4);
      score -= impact;
      factors.push({ label: `${input.warningAlerts} alerta(s) de atenção`, impact: -impact });
    }

    if (input.commitmentPercent > 80) {
      score -= 18;
      factors.push({ label: "Comprometimento da renda elevado", impact: -18 });
    } else if (input.commitmentPercent > 60) {
      score -= 8;
      factors.push({ label: "Comprometimento da renda moderado", impact: -8 });
    }

    if (input.goalsAtRisk > 0) {
      const impact = Math.min(20, input.goalsAtRisk * 8);
      score -= impact;
      factors.push({ label: `${input.goalsAtRisk} meta(s) em risco`, impact: -impact });
    }

    if (input.overdueReceivableAmount > 0) {
      score -= 10;
      factors.push({ label: "Recebíveis em atraso", impact: -10 });
    }

    if (input.subscriptionDuplicates.length > 0) {
      score -= 8;
      factors.push({ label: "Possíveis assinaturas duplicadas", impact: -8 });
    }

    const leakTotal = input.moneyLeaks.reduce((s, m) => s + m.monthlyTotal, 0);
    if (leakTotal >= 100) {
      score -= 10;
      factors.push({ label: "Gastos invisíveis recorrentes", impact: -10 });
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score,
      classification: this.classify(score),
      factors,
    };
  }

  private classify(score: number): FinancialHealthClassification {
    if (score >= 90) return "EXCELENTE";
    if (score >= 75) return "SAUDAVEL";
    if (score >= 60) return "ATENCAO";
    return "CRITICA";
  }
}
