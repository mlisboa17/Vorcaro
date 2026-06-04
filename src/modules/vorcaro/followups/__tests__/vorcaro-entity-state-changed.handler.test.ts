import { describe, expect, it, vi } from "vitest";
import { VorcaroEntityStateChangedHandlerImpl } from "../application/handlers/vorcaro-entity-state-changed.handler.impl";
import type { VorcaroFollowUpService } from "../application/services/vorcaro-followup.service";

describe("VorcaroEntityStateChangedHandlerImpl", () => {
  it("completa follow-ups quando recebível é RECEIVED", async () => {
    const followUps = {
      completeByEntity: vi.fn().mockResolvedValue(1),
    } as unknown as VorcaroFollowUpService;
    const handler = new VorcaroEntityStateChangedHandlerImpl(followUps);

    await handler.onEntityStateChanged({
      userId: "u1",
      entityType: "RECEIVABLE",
      entityId: "r1",
      newStatus: "RECEIVED",
    });

    expect(followUps.completeByEntity).toHaveBeenCalledWith("u1", "RECEIVABLE", "r1");
  });

  it("ignora status não elegíveis para auto-complete", async () => {
    const followUps = {
      completeByEntity: vi.fn(),
    } as unknown as VorcaroFollowUpService;
    const handler = new VorcaroEntityStateChangedHandlerImpl(followUps);

    await handler.onEntityStateChanged({
      userId: "u1",
      entityType: "ALERT",
      entityId: "a1",
      newStatus: "DISMISSED",
    });

    expect(followUps.completeByEntity).not.toHaveBeenCalled();
  });
});
