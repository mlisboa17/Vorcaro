import type { AdvisorAction, AdvisorActionType } from "../types/advisor-action";
import type { RecommendationHashInput } from "./advisor-recommendation-hash.service";

function metaRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
}

export function resolveHashInput(
  userId: string,
  action: Pick<AdvisorAction, "type" | "id" | "metadata">,
  month: string,
): RecommendationHashInput {
  const meta = metaRecord(action.metadata);
  const base: RecommendationHashInput = {
    userId,
    actionType: action.type,
    month,
    category: "",
    normalizedName: "",
    relatedEntityId: "",
  };

  switch (action.type as AdvisorActionType) {
    case "COLLECT_RECEIVABLE":
      return {
        ...base,
        category: "RECEIVABLE",
        relatedEntityId: String(meta.receivableId ?? action.id),
      };
    case "REVIEW_SUBSCRIPTIONS":
      return {
        ...base,
        category: "SUBSCRIPTION",
        normalizedName: String(meta.normalizedName ?? ""),
        relatedEntityId: String(meta.duplicateGroup ?? action.id),
      };
    case "REDUCE_SUPERFLUOUS_EXPENSES":
      return {
        ...base,
        category: String(meta.category ?? "SPEND"),
        relatedEntityId: String(meta.category ?? action.id.replace(/^spend-/, "")),
      };
    case "REDUCE_EXPENSES":
      return {
        ...base,
        category: String(meta.category ?? "GERAL"),
        relatedEntityId: String(meta.category ?? "geral"),
      };
    case "REVIEW_SMALL_EXPENSES":
      return {
        ...base,
        category: String(meta.category ?? "PEQUENOS_GASTOS"),
        relatedEntityId: "money-leak",
      };
    case "VIEW_GOAL":
      return {
        ...base,
        category: "GOAL",
        relatedEntityId: String(meta.goalId ?? action.id),
      };
    case "VIEW_CREDIT_CARD":
      return {
        ...base,
        category: "CREDIT_CARD",
        relatedEntityId: action.id.replace(/^alert-/, ""),
      };
    case "REVIEW_INSTALLMENTS":
      return {
        ...base,
        category: "COMMITMENT",
        relatedEntityId: action.id === "high-commitment" ? "high-commitment" : action.id.replace(/^alert-/, ""),
      };
    case "VIEW_ALERTS":
      return {
        ...base,
        category: "ALERT",
        relatedEntityId: String(meta.alertId ?? action.id.replace(/^alert-/, "")),
      };
    case "VIEW_COMMITMENTS":
      return {
        ...base,
        category: "COMMITMENT",
        relatedEntityId: action.id.replace(/^alert-/, ""),
      };
    default:
      return { ...base, relatedEntityId: action.id };
  }
}
