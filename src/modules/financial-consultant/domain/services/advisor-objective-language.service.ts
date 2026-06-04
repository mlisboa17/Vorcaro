import type { AdvisorAction, AdvisorActionType, SpendingHealthCategory } from "../types/advisor-action";
import type { MoneyLeakFinding, SubscriptionDuplicateFinding } from "../types/advisor-action";
import type { ObjectiveMetric } from "../types/objective-metric";

export type ObjectiveLanguageContext = {
  monthIncome: number;
  commitmentPercent?: number;
  spendingHealth?: SpendingHealthCategory[];
};

const INCOME_THRESHOLD_DELIVERY = 10;
const INCOME_THRESHOLD_HIGH = 15;

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export class AdvisorObjectiveLanguageService {
  buildMetric(
    action: Pick<AdvisorAction, "type" | "metadata" | "estimatedImpact">,
    ctx: ObjectiveLanguageContext,
    extras?: {
      duplicate?: SubscriptionDuplicateFinding;
      leak?: MoneyLeakFinding;
      spend?: SpendingHealthCategory;
    },
  ): ObjectiveMetric {
    const meta = (action.metadata ?? {}) as Record<string, unknown>;
    const income = ctx.monthIncome > 0 ? ctx.monthIncome : 0;

    switch (action.type as AdvisorActionType) {
      case "REDUCE_SUPERFLUOUS_EXPENSES": {
        const spend = extras?.spend;
        const current = spend?.monthlyAmount ?? Number(meta.currentSpending ?? 0);
        const pct = spend?.percentOfIncome ?? (income > 0 ? (current / income) * 100 : 0);
        const threshold = spend?.key === "DELIVERY" ? INCOME_THRESHOLD_DELIVERY : INCOME_THRESHOLD_HIGH;
        const qualifier =
          pct >= threshold ? "Comprometimento alto" : "Comprometimento moderado";
        return {
          currentValue: current,
          comparisonValue: income,
          comparisonType: "INCOME_PERCENTAGE",
          percentage: Math.round(pct * 10) / 10,
          threshold,
          explanation: `${qualifier}: ${formatBRL(current)} com ${spend?.label?.toLowerCase() ?? "categoria"} neste mês, equivalente a ${pct.toFixed(1)}% da sua renda prevista${pct > threshold ? `, acima do limite ideal de ${threshold}%` : ""}.`,
        };
      }
      case "REVIEW_SUBSCRIPTIONS": {
        const dup = extras?.duplicate;
        const saving = Number(meta.potentialMonthlySaving ?? dup?.potentialMonthlySaving ?? 0);
        const name = String(meta.normalizedName ?? dup?.normalizedName ?? "serviço");
        const count = dup?.suspectedIds.length ?? 2;
        const cards = dup?.cardIds.length ?? 2;
        return {
          currentValue: dup?.monthlyTotal ?? saving,
          comparisonValue: saving,
          comparisonType: "DUPLICATE_COUNT",
          percentage: cards,
          explanation: `${name} aparece em ${count} lançamento(s) em ${cards} cartão(ões) diferentes neste mês, com possível custo duplicado de ${formatBRL(saving)}/mês.`,
        };
      }
      case "REVIEW_SMALL_EXPENSES": {
        const leak = extras?.leak;
        const total = Number(meta.monthlyTotal ?? leak?.monthlyTotal ?? 0);
        const trend = String(meta.trend ?? leak?.trend ?? "STABLE");
        const delta =
          typeof meta.trendDeltaPercent === "number"
            ? meta.trendDeltaPercent
            : leak?.trendDeltaPercent;
        return {
          currentValue: total,
          comparisonType: trend === "UP" ? "THREE_MONTH_TREND" : "MONTHLY_AVERAGE",
          trendDeltaPercent: delta,
          explanation:
            trend === "UP" && delta != null
              ? `Pequenos gastos recorrentes somam ${formatBRL(total)}/mês, com alta de ${delta}% nos últimos 3 meses.`
              : `Pequenos gastos recorrentes somam ${formatBRL(total)}/mês em ${meta.occurrences ?? leak?.occurrences ?? 0} item(ns).`,
        };
      }
      case "COLLECT_RECEIVABLE": {
        const value = Number(meta.value ?? action.estimatedImpact ?? 0);
        return {
          currentValue: value,
          comparisonType: "THRESHOLD",
          explanation: `Recebível pendente de ${formatBRL(value)} — valor em aberto que impacta seu fluxo de caixa até a cobrança.`,
        };
      }
      case "REVIEW_INSTALLMENTS": {
        const pct = ctx.commitmentPercent ?? 0;
        return {
          currentValue: pct,
          comparisonValue: 80,
          comparisonType: "THRESHOLD",
          threshold: 80,
          percentage: Math.round(pct * 10) / 10,
          explanation: `Comprometimento do mês em ${pct.toFixed(1)}% da renda prevista, acima do limite de 80% para parcelamentos e recorrências.`,
        };
      }
      case "VIEW_CREDIT_CARD": {
        const total = Number(meta.creditCardTotal ?? 0);
        const pct = Number(meta.percentOfIncome ?? 0);
        return {
          currentValue: total,
          comparisonValue: income,
          comparisonType: "INCOME_PERCENTAGE",
          percentage: pct,
          threshold: 30,
          explanation: `Fatura do cartão em ${formatBRL(total)}${pct > 0 ? ` (${pct}% da renda prevista)` : ""} — revise limites e parcelas antes do vencimento.`,
        };
      }
      default:
        return {
          currentValue: Number(action.estimatedImpact ?? 0),
          comparisonType: "THRESHOLD",
          explanation: "Condição detectada pelo motor do consultor com base nos seus dados atuais.",
        };
    }
  }

  formatDescription(metric: ObjectiveMetric, title: string): string {
    return `${title}. ${metric.explanation}`;
  }
}
