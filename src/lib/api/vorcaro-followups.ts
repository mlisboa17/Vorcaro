import { prisma } from "@/lib/prisma";
import { VorcaroActionExecutedHandlerImpl } from "@/modules/vorcaro/followups/application/handlers/vorcaro-action-executed.handler.impl";
import { VorcaroEntityStateChangedHandlerImpl } from "@/modules/vorcaro/followups/application/handlers/vorcaro-entity-state-changed.handler.impl";
import { VorcaroFollowUpSchedulerService } from "@/modules/vorcaro/followups/application/services/vorcaro-followup-scheduler.service";
import { VorcaroFollowUpService } from "@/modules/vorcaro/followups/application/services/vorcaro-followup.service";
import { FollowUpTool } from "@/modules/vorcaro/followups/application/tools/follow-up-tool";
import { PrismaVorcaroFollowUpRepository } from "@/modules/vorcaro/followups/infrastructure/repositories/prisma-vorcaro-followup.repository";

export function buildVorcaroFollowUpRepository() {
  return new PrismaVorcaroFollowUpRepository(prisma);
}

export function buildVorcaroFollowUpService() {
  return new VorcaroFollowUpService(buildVorcaroFollowUpRepository());
}

export function buildVorcaroFollowUpScheduler() {
  return new VorcaroFollowUpSchedulerService(prisma);
}

export function buildFollowUpTool() {
  return new FollowUpTool(buildVorcaroFollowUpService());
}

let actionExecutedHandler: VorcaroActionExecutedHandlerImpl | null = null;
let entityStateChangedHandler: VorcaroEntityStateChangedHandlerImpl | null = null;

export function getVorcaroActionExecutedHandler() {
  if (!actionExecutedHandler) {
    actionExecutedHandler = new VorcaroActionExecutedHandlerImpl(buildVorcaroFollowUpService());
  }
  return actionExecutedHandler;
}

export function getVorcaroEntityStateChangedHandler() {
  if (!entityStateChangedHandler) {
    entityStateChangedHandler = new VorcaroEntityStateChangedHandlerImpl(
      buildVorcaroFollowUpService(),
    );
  }
  return entityStateChangedHandler;
}
