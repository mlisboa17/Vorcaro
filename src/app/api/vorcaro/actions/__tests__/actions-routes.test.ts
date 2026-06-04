import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as approvePost } from "../[id]/approve/route";
import { POST as rejectPost } from "../[id]/reject/route";
import { POST as executePost } from "../[id]/execute/route";
import { VorcaroActionError } from "@/modules/vorcaro/actions/domain/errors/vorcaro-action.error";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const approveProposalMock = vi.fn();
const rejectProposalMock = vi.fn();
const executeProposalMock = vi.fn();

vi.mock("@/lib/api/vorcaro-actions", () => ({
  buildVorcaroActionProposalService: () => ({
    approveProposal: approveProposalMock,
    rejectProposal: rejectProposalMock,
    executeProposal: executeProposalMock,
  }),
}));

const baseProposal = {
  id: "prop-1",
  userId: "user-1",
  actionType: "OPEN_ALERT",
  title: "Abrir alerta",
  description: "Deseja abrir?",
  payload: { alertId: "alert-1", fingerprint: "OPEN_ALERT:alert-1" },
  status: "APPROVED",
  approvedAt: new Date("2026-06-04T12:00:00.000Z"),
  executedAt: null,
  failedAt: null,
  expiresAt: new Date("2026-06-04T12:15:00.000Z"),
  failureReason: null,
  createdAt: new Date("2026-06-04T12:00:00.000Z"),
  updatedAt: new Date("2026-06-04T12:00:00.000Z"),
};

const executionResult = {
  status: "EXECUTED" as const,
  targetUrl: "/dashboard/alerts?id=alert-1",
  navigationPayload: { alertId: "alert-1" },
  title: "Abrir alerta",
  message: "Abrindo a central de alertas.",
};

describe("POST /api/vorcaro/actions/:id/approve", () => {
  beforeEach(() => {
    approveProposalMock.mockReset();
  });

  it("aprova proposta pendente e retorna status APPROVED", async () => {
    approveProposalMock.mockResolvedValue({ ...baseProposal, status: "APPROVED" });
    const res = await approvePost(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: "prop-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("APPROVED");
    expect(approveProposalMock).toHaveBeenCalledWith("user-1", "prop-1");
  });

  it("retorna 410 quando proposta expirada", async () => {
    approveProposalMock.mockRejectedValue(
      new VorcaroActionError("EXPIRED", "Esta proposta expirou."),
    );
    const res = await approvePost(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: "prop-expired" }),
    });
    expect(res.status).toBe(410);
  });

  it("retorna 404 para proposta de outro usuário", async () => {
    approveProposalMock.mockRejectedValue(
      new VorcaroActionError("NOT_FOUND", "Proposta não encontrada."),
    );
    const res = await approvePost(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: "prop-other" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/vorcaro/actions/:id/reject", () => {
  beforeEach(() => {
    rejectProposalMock.mockReset();
  });

  it("rejeita proposta pendente", async () => {
    rejectProposalMock.mockResolvedValue({ ...baseProposal, status: "REJECTED" });
    const res = await rejectPost(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: "prop-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("REJECTED");
    expect(rejectProposalMock).toHaveBeenCalledWith("user-1", "prop-1");
  });
});

describe("POST /api/vorcaro/actions/:id/execute", () => {
  beforeEach(() => {
    executeProposalMock.mockReset();
  });

  it("executa proposta aprovada e retorna targetUrl/navigationPayload", async () => {
    executeProposalMock.mockResolvedValue({
      proposal: { ...baseProposal, status: "EXECUTED", executedAt: new Date() },
      result: executionResult,
    });
    const res = await executePost(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: "prop-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.execution.status).toBe("EXECUTED");
    expect(body.execution.targetUrl).toBe("/dashboard/alerts?id=alert-1");
    expect(body.execution.navigationPayload).toEqual({ alertId: "alert-1" });
    expect(executeProposalMock).toHaveBeenCalledWith("user-1", "prop-1");
  });

  it("retorna 404 para proposta de outro usuário", async () => {
    executeProposalMock.mockRejectedValue(
      new VorcaroActionError("NOT_FOUND", "Proposta não encontrada."),
    );
    const res = await executePost(new Request("http://x", { method: "POST" }), {
      params: Promise.resolve({ id: "prop-other" }),
    });
    expect(res.status).toBe(404);
  });
});
