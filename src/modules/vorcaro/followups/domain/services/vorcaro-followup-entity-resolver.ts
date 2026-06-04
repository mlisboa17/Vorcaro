import type { VorcaroActionType } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";
import type { VorcaroFollowUpEntityType } from "../types/vorcaro-followup";

export function resolveEntityFromAction(
  actionType: VorcaroActionType,
  payload: Record<string, unknown>,
): { relatedEntityType: VorcaroFollowUpEntityType | null; relatedEntityId: string | null } {
  const str = (key: string) => {
    const v = payload[key];
    return typeof v === "string" && v ? v : null;
  };

  switch (actionType) {
    case "OPEN_RECEIVABLE":
      return { relatedEntityType: "RECEIVABLE", relatedEntityId: str("receivableId") };
    case "OPEN_GOAL":
      return { relatedEntityType: "GOAL", relatedEntityId: str("goalId") };
    case "OPEN_ALERT":
      return { relatedEntityType: "ALERT", relatedEntityId: str("alertId") };
    default:
      return { relatedEntityType: null, relatedEntityId: null };
  }
}

const AUTO_COMPLETE_STATUS: Record<VorcaroFollowUpEntityType, string> = {
  RECEIVABLE: "RECEIVED",
  GOAL: "ACHIEVED",
  ALERT: "RESOLVED",
};

export function shouldAutoCompleteFollowUp(
  entityType: VorcaroFollowUpEntityType,
  newStatus: string,
): boolean {
  return newStatus === AUTO_COMPLETE_STATUS[entityType];
}
