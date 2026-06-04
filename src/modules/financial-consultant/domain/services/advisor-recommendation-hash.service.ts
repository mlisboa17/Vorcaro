import { createHash } from "node:crypto";
import type { AdvisorActionType } from "../types/advisor-action";
import { HASH_PATTERN } from "../types/advisor-recommendation-state";

export type RecommendationHashInput = {
  userId: string;
  actionType: AdvisorActionType | string;
  category?: string;
  normalizedName?: string;
  relatedEntityId?: string;
  month: string;
};

export class AdvisorRecommendationHashService {
  compute(input: RecommendationHashInput): string {
    const payload = [
      input.userId,
      input.actionType,
      input.category ?? "",
      input.normalizedName ?? "",
      input.relatedEntityId ?? "",
      input.month,
    ].join("|");

    return createHash("sha256").update(payload, "utf8").digest("hex");
  }

  isValidFormat(hash: string): boolean {
    return HASH_PATTERN.test(hash.trim());
  }

  currentMonthKey(date = new Date()): string {
    return date.toISOString().slice(0, 7);
  }
}
