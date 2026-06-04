import type {
  VorcaroActionExecutedEvent,
  VorcaroActionExecutedHandler,
} from "../../domain/handlers/vorcaro-action-executed.handler";
import { VorcaroFollowUpService } from "../services/vorcaro-followup.service";

export class VorcaroActionExecutedHandlerImpl implements VorcaroActionExecutedHandler {
  constructor(private readonly followUps: VorcaroFollowUpService) {}

  async onActionExecuted(event: VorcaroActionExecutedEvent): Promise<void> {
    await this.followUps.createFromExecutedAction({
      userId: event.userId,
      proposalId: event.proposalId,
      actionType: event.actionType,
      title: event.title,
      description: event.description,
      payload: event.payload,
    });
  }
}
