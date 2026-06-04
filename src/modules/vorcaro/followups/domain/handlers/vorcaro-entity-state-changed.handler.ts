import type { VorcaroFollowUpEntityType } from "../types/vorcaro-followup";

export type VorcaroEntityStateChangedEvent = {
  userId: string;
  entityType: VorcaroFollowUpEntityType;
  entityId: string;
  newStatus: string;
};

export interface VorcaroEntityStateChangedHandler {
  onEntityStateChanged(event: VorcaroEntityStateChangedEvent): Promise<void>;
}
