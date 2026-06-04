import { normalizeMerchantText } from "../../domain/subscription-brands";
import type { SpendingHealthCategory } from "../../domain/types/advisor-action";

const CATEGORY_RULES: Array<{ key: string; label: string; keywords: string[] }> = [
  { key: "DELIVERY", label: "Delivery", keywords: ["ifood", "rappi", "uber eats", "delivery", "aiqfome"] },
  { key: "STREAMING", label: "Streaming", keywords: ["netflix", "spotify", "disney", "prime", "max", "globoplay"] },
  { key: "SUBSCRIPTIONS", label: "Assinaturas", keywords: ["assinatura", "premium", "mensalidade", "plano"] },
  { key: "APPS", label: "Apps", keywords: ["app store", "google play", "apple.com", "app "] },
  { key: "BANK_FEES", label: "Taxas bancárias", keywords: ["tarifa", "taxa", "anuidade", "iof", "juros"] },
  { key: "IMPULSE", label: "Compras impulsivas", keywords: ["mercado livre", "shopee", "amazon", "magalu"] },
];

export type SpendingTransactionRow = {
  description: string;
  amount: number;
  monthKey: string;
};

export class SpendingHealthAnalyzerService {
  analyze(
    transactions: SpendingTransactionRow[],
    monthlyIncome: number,
  ): SpendingHealthCategory[] {
    const byCategoryMonth = new Map<string, Map<string, number>>();

    for (const tx of transactions) {
      const category = this.classify(tx.description);
      const monthMap = byCategoryMonth.get(category.key) ?? new Map<string, number>();
      monthMap.set(tx.monthKey, (monthMap.get(tx.monthKey) ?? 0) + tx.amount);
      byCategoryMonth.set(category.key, monthMap);
    }

    const results: SpendingHealthCategory[] = [];
    const sortedMonths = [...new Set(transactions.map((t) => t.monthKey))].sort();

    for (const rule of CATEGORY_RULES) {
      const monthMap = byCategoryMonth.get(rule.key);
      if (!monthMap || monthMap.size === 0) continue;

      const lastMonth = sortedMonths[sortedMonths.length - 1];
      const monthlyAmount = monthMap.get(lastMonth) ?? 0;
      if (monthlyAmount <= 0) continue;

      const amounts = sortedMonths.slice(-3).map((m) => monthMap.get(m) ?? 0);
      const trend = this.resolveTrend(amounts);

      results.push({
        key: rule.key,
        label: rule.label,
        monthlyAmount: Math.round(monthlyAmount * 100) / 100,
        percentOfIncome:
          monthlyIncome > 0 ? Math.round((monthlyAmount / monthlyIncome) * 1000) / 10 : 0,
        trend,
      });
    }

    return results.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  }

  private classify(description: string): { key: string; label: string } {
    const norm = normalizeMerchantText(description);
    for (const rule of CATEGORY_RULES) {
      if (rule.keywords.some((k) => norm.includes(k))) {
        return { key: rule.key, label: rule.label };
      }
    }
    return { key: "OTHER", label: "Outros" };
  }

  private resolveTrend(amounts: number[]): "UP" | "DOWN" | "STABLE" {
    if (amounts.length < 2) return "STABLE";
    const first = amounts[0];
    const last = amounts[amounts.length - 1];
    if (last > first * 1.15) return "UP";
    if (last < first * 0.85) return "DOWN";
    return "STABLE";
  }
}
