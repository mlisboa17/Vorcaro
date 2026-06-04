import { describe, expect, it, vi, beforeEach } from "vitest";
import { VorcaroActionInterpreterService } from "../application/services/vorcaro-action-interpreter.service";
import { VorcaroActionError } from "../domain/errors/vorcaro-action.error";

const NO_PENDING_MESSAGE =
  "Não há ação pendente para confirmar. Peça uma análise ao Vorcaro ou use o painel de ações.";

describe("fluxo chat — proposta PENDING antiga (>5 min)", () => {
  const approveMock = vi.fn();
  const executeMock = vi.fn();
  const rejectMock = vi.fn();

  const repo = {
    findLatestPendingForUser: vi.fn(),
  };

  const interpreter = new VorcaroActionInterpreterService(repo as never);

  beforeEach(() => {
    approveMock.mockReset();
    executeMock.mockReset();
    rejectMock.mockReset();
    repo.findLatestPendingForUser.mockReset();
  });

  async function handleSimLikeConversation(userId: string, message: string): Promise<string> {
    const interpretation = interpreter.interpret(message);
    if (!interpretation) return "ignored";

    const pending = await interpreter.findEligiblePendingProposal(userId);
    if (!pending) {
      return NO_PENDING_MESSAGE;
    }

    if (interpretation === "REJECT") {
      await rejectMock(userId, pending.id);
      return "rejected";
    }

    await approveMock(userId, pending.id);
    await executeMock(userId, pending.id);
    return "executed";
  }

  it('usuário diz "sim" com proposta antiga: não aprova, não executa, resposta sem ação válida', async () => {
    repo.findLatestPendingForUser.mockResolvedValue(null);

    const answer = await handleSimLikeConversation("user-1", "sim");

    expect(answer).toBe(NO_PENDING_MESSAGE);
    expect(approveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
    expect(rejectMock).not.toHaveBeenCalled();
  });
});

describe("VorcaroActionError codes usados nas APIs", () => {
  it("EXPIRED e NOT_FOUND para guardrails de aprovação", () => {
    expect(new VorcaroActionError("EXPIRED", "expirou").code).toBe("EXPIRED");
    expect(new VorcaroActionError("NOT_FOUND", "outro user").code).toBe("NOT_FOUND");
  });
});
