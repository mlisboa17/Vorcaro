import { resolveActionTarget } from "../../domain/advisor-action-routes";
import { resolveHashInput } from "../../domain/services/advisor-hash-input.resolver";
import {
  AdvisorObjectiveLanguageService,
  type ObjectiveLanguageContext,
} from "../../domain/services/advisor-objective-language.service";
import { AdvisorRecommendationHashService } from "../../domain/services/advisor-recommendation-hash.service";
import type {
  AdvisorAction,
  MoneyLeakFinding,
  SpendingHealthCategory,
  SubscriptionDuplicateFinding,
} from "../../domain/types/advisor-action";

export class AdvisorActionEnrichmentService {
  private readonly hashService = new AdvisorRecommendationHashService();
  private readonly languageService = new AdvisorObjectiveLanguageService();

  enrich(
    userId: string,
    actions: AdvisorAction[],
    ctx: ObjectiveLanguageContext & {
      subscriptionDuplicates: SubscriptionDuplicateFinding[];
      moneyLeaks: MoneyLeakFinding[];
      spendingHealth: SpendingHealthCategory[];
    },
    month = this.hashService.currentMonthKey(),
  ): AdvisorAction[] {
    const dupByGroup = new Map(ctx.subscriptionDuplicates.map((d) => [d.duplicateGroup, d]));
    const spendByKey = new Map(ctx.spendingHealth.map((s) => [s.key, s]));
    const leak = ctx.moneyLeaks[0];

    return actions.map((action) => {
      const hashInput = resolveHashInput(userId, action, month);
      const recommendationHash = this.hashService.compute(hashInput);
      const actionUrl = resolveActionTarget(action.type, action.metadata as Record<string, unknown>);

      const dup =
        action.type === "REVIEW_SUBSCRIPTIONS"
          ? dupByGroup.get(String((action.metadata as { duplicateGroup?: string }).duplicateGroup ?? ""))
          : undefined;
      const spendKey =
        action.type === "REDUCE_SUPERFLUOUS_EXPENSES"
          ? String((action.metadata as { category?: string }).category ?? "")
          : "";
      const spend = spendByKey.get(spendKey);

      const objectiveMetric = this.languageService.buildMetric(action, ctx, {
        duplicate: dup,
        leak: action.type === "REVIEW_SMALL_EXPENSES" ? leak : undefined,
        spend,
      });

      const description = this.languageService.formatDescription(objectiveMetric, action.title);

      return {
        ...action,
        recommendationHash,
        actionUrl: actionUrl ?? "",
        target: actionUrl,
        description,
        objectiveMetric,
      };
    });
  }
}
