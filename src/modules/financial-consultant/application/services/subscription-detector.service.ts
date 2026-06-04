import { SubscriptionNameNormalizer } from "../../domain/services/subscription-name-normalizer";
import type { SubscriptionDuplicateFinding } from "../../domain/types/advisor-action";

export type RecurringExpenseRow = {
  id: string;
  descricao: string;
  valor: number;
  cardId: string | null;
  financialAccountId: string;
  dataInicio?: Date;
  createdAt?: Date;
};

export class SubscriptionDetectorService {
  constructor(private readonly normalizer = new SubscriptionNameNormalizer()) {}

  detect(rows: RecurringExpenseRow[]): SubscriptionDuplicateFinding[] {
    const byNormalized = new Map<
      string,
      {
        normalizedName: string;
        items: RecurringExpenseRow[];
        cardIds: Set<string>;
        accountIds: Set<string>;
      }
    >();

    for (const row of rows) {
      const normalizedName = this.normalizer.normalize(row.descricao);
      if (!normalizedName) continue;

      const bucket = byNormalized.get(normalizedName) ?? {
        normalizedName,
        items: [],
        cardIds: new Set<string>(),
        accountIds: new Set<string>(),
      };
      bucket.items.push(row);
      if (row.cardId) bucket.cardIds.add(row.cardId);
      bucket.accountIds.add(row.financialAccountId);
      byNormalized.set(normalizedName, bucket);
    }

    const findings: SubscriptionDuplicateFinding[] = [];

    for (const bucket of byNormalized.values()) {
      const distinctCards = bucket.cardIds.size;
      const distinctAccounts = bucket.accountIds.size;
      const multipleSources =
        distinctCards >= 2 ||
        distinctAccounts >= 2 ||
        (distinctCards >= 1 && distinctAccounts >= 1 && bucket.items.length >= 2);

      if (bucket.items.length < 2 || !multipleSources) continue;

      const monthlyTotal = bucket.items.reduce((s, i) => s + i.valor, 0);
      const minCharge = Math.min(...bucket.items.map((i) => i.valor));
      const potentialMonthlySaving = Math.max(0, monthlyTotal - minCharge);

      findings.push({
        brand: bucket.normalizedName.toLowerCase(),
        normalizedName: bucket.normalizedName,
        duplicateGroup: this.normalizer.toDuplicateGroup(bucket.normalizedName),
        suspectedIds: bucket.items.map((i) => i.id),
        potentialMonthlySaving: Math.round(potentialMonthlySaving * 100) / 100,
        occurrences: bucket.items.length,
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        descriptions: bucket.items.map((i) => i.descricao),
        cardIds: [...bucket.cardIds],
        accountIds: [...bucket.accountIds],
      });
    }

    return findings.sort((a, b) => b.potentialMonthlySaving - a.potentialMonthlySaving);
  }
}
