import type { VorcaroActionType } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";

export type VorcaroActionExecutedEvent = {
  userId: string;
  proposalId: string;
  actionType: VorcaroActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
};

export interface VorcaroActionExecutedHandler {
  onActionExecuted(event: VorcaroActionExecutedEvent): Promise<void>;
}
