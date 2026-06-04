import { describe, expect, it, vi, beforeEach } from "vitest";
import { VorcaroActionInterpreterService } from "../application/services/vorcaro-action-interpreter.service";
import type { VorcaroActionProposalRecord } from "../domain/types/vorcaro-action";

describe("VorcaroActionInterpreterService", () => {
  const repo = {
    findLatestPendingForUser: vi.fn(),
  };
  const interpreter = new VorcaroActionInterpreterService(repo as never);

  beforeEach(() => {
    repo.findLatestPendingForUser.mockReset();
  });

  it("detecta confirmação e rejeição", () => {
    expect(interpreter.interpret("sim")).toBe("CONFIRM");
    expect(interpreter.interpret("confirmar")).toBe("CONFIRM");
    expect(interpreter.interpret("não")).toBe("REJECT");
    expect(interpreter.interpret("cancelar")).toBe("REJECT");
    expect(interpreter.interpret("olá")).toBeNull();
  });

  it("encontra última proposta pendente recente", async () => {
    const proposal = {
      id: "p1",
      status: "PENDING",
    } as VorcaroActionProposalRecord;
    repo.findLatestPendingForUser.mockResolvedValue(proposal);

    const found = await interpreter.findEligiblePendingProposal("user-1");
    expect(found?.id).toBe("p1");
    expect(repo.findLatestPendingForUser).toHaveBeenCalledWith(
      "user-1",
      5 * 60_000,
    );
  });

  it("ignora quando não há proposta elegível", async () => {
    repo.findLatestPendingForUser.mockResolvedValue(null);
    expect(await interpreter.findEligiblePendingProposal("user-1")).toBeNull();
  });

  it("ignora proposta PENDING criada há mais de 5 minutos", async () => {
    // Repositório filtra createdAt >= now - 5min; proposta antiga não é retornada.
    repo.findLatestPendingForUser.mockResolvedValue(null);

    expect(interpreter.interpret("sim")).toBe("CONFIRM");
    const pending = await interpreter.findEligiblePendingProposal("user-1");
    expect(pending).toBeNull();
    expect(repo.findLatestPendingForUser).toHaveBeenCalledWith("user-1", 5 * 60_000);
  });
});
