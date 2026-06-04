import type { VorcaroActionType } from "../types/vorcaro-action";

export function buildVorcaroActionFingerprint(
  actionType: VorcaroActionType,
  payload: Record<string, unknown>,
): string {
  switch (actionType) {
    case "OPEN_ALERT":
      return `OPEN_ALERT:${String(payload.alertId ?? "")}`;
    case "OPEN_RECEIVABLE":
      return `OPEN_RECEIVABLE:${String(payload.receivableId ?? "")}`;
    case "OPEN_GOAL":
      return `OPEN_GOAL:${String(payload.goalId ?? "")}`;
    case "OPEN_NOTIFICATION":
      return `OPEN_NOTIFICATION:${String(payload.notificationId ?? "")}`;
    case "OPEN_DASHBOARD_SECTION":
      return `OPEN_DASHBOARD_SECTION:${String(payload.section ?? "")}`;
    case "OPEN_COMMITMENT":
      return "OPEN_COMMITMENT:default";
    case "OPEN_SUBSCRIPTION":
      return "OPEN_SUBSCRIPTION:default";
    case "OPEN_MONEY_LEAK":
      return "OPEN_MONEY_LEAK:default";
    case "OPEN_TIMELINE":
      return "OPEN_TIMELINE:default";
    case "CREATE_RULE_SUGGESTION":
      return "CREATE_RULE_SUGGESTION:default";
    case "CREATE_GOAL_SUGGESTION":
      return "CREATE_GOAL_SUGGESTION:default";
    default:
      return `${actionType}:default`;
  }
}

export function withFingerprintPayload(
  actionType: VorcaroActionType,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const fingerprint = buildVorcaroActionFingerprint(actionType, payload);
  return { ...payload, fingerprint };
}
