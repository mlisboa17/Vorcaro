import type {
  VorcaroEntityStateChangedEvent,
  VorcaroEntityStateChangedHandler,
} from "../../domain/handlers/vorcaro-entity-state-changed.handler";
import { shouldAutoCompleteFollowUp } from "../../domain/services/vorcaro-followup-entity-resolver";
import { VorcaroFollowUpService } from "../services/vorcaro-followup.service";

export class VorcaroEntityStateChangedHandlerImpl implements VorcaroEntityStateChangedHandler {
  constructor(private readonly followUps: VorcaroFollowUpService) {}

  async onEntityStateChanged(event: VorcaroEntityStateChangedEvent): Promise<void> {
    if (!shouldAutoCompleteFollowUp(event.entityType, event.newStatus)) {
      return;
    }
    await this.followUps.completeByEntity(event.userId, event.entityType, event.entityId);
  }
}
