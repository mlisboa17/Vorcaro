import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/lib/api/vorcaro-followups", () => ({
  getVorcaroActionExecutedHandler: () => ({
    onActionExecuted: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { VorcaroActionProposalService } from "../application/services/vorcaro-action-proposal.service";
import { vorcaroActionObservability } from "../application/services/vorcaro-action-observability.service";
import type { VorcaroActionProposalRecord } from "../domain/types/vorcaro-action";
import { VORCARO_ACTION_EXPIRATION_MINUTES } from "../domain/types/vorcaro-action";

function makeProposal(overrides: Partial<VorcaroActionProposalRecord> = {}): VorcaroActionProposalRecord {
  const now = new Date();
  return {
    id: "prop-1",
    userId: "user-1",
    actionType: "OPEN_ALERT",
    title: "Abrir alerta",
    description: "Deseja abrir?",
    payload: { fingerprint: "OPEN_ALERT:alert-1", alertId: "alert-1" },
    status: "PENDING",
    approvedAt: null,
    executedAt: null,
    failedAt: null,
    expiresAt: new Date(now.getTime() + VORCARO_ACTION_EXPIRATION_MINUTES * 60_000),
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockRepo() {
  const store = new Map<string, VorcaroActionProposalRecord>();
  return {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findByIdForUser: vi.fn(async (id: string, userId: string) => {
      const p = store.get(id);
      return p && p.userId === userId ? p : null;
    }),
    findPendingByFingerprint: vi.fn(async () => null as VorcaroActionProposalRecord | null),
    findLatestPendingForUser: vi.fn(async () => null),
    create: vi.fn(async (data: {
      userId: string;
      actionType: string;
      title: string;
      description: string;
      payload: Record<string, unknown>;
      expiresAt: Date;
    }) => {
      const row = makeProposal({
        id: `prop-${store.size + 1}`,
        userId: data.userId,
        actionType: data.actionType as VorcaroActionProposalRecord["actionType"],
        title: data.title,
        description: data.description,
        payload: data.payload as Record<string, unknown>,
        expiresAt: data.expiresAt,
      });
      store.set(row.id, row);
      return row;
    }),
    update: vi.fn(async (id: string, data: Partial<VorcaroActionProposalRecord>) => {
      const current = store.get(id);
      if (!current) throw new Error("missing");
      const next = { ...current, ...data, updatedAt: new Date() };
      store.set(id, next as VorcaroActionProposalRecord);
      return next as VorcaroActionProposalRecord;
    }),
    list: vi.fn(async (userId: string) =>
      [...store.values()].filter((p) => p.userId === userId),
    ),
    expirePendingForUser: vi.fn(async () => 0),
    expireAllPending: vi.fn(async () => 0),
    countMutationsSince: vi.fn(async () => 0),
    countCreatesSince: vi.fn(async () => 0),
    _store: store,
    _setPendingByFingerprint(p: VorcaroActionProposalRecord) {
      store.set(p.id, p);
      this.findPendingByFingerprint.mockResolvedValue(p);
    },
  };
}

describe("VorcaroActionProposalService", () => {
  let repo: ReturnType<typeof createMockRepo>;
  let service: VorcaroActionProposalService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new VorcaroActionProposalService(repo as never);
    vorcaroActionObservability.reset();
  });

  it("createProposal define expiração em 15 minutos", async () => {
    const before = Date.now();
    const created = await service.createProposal({
      userId: "user-1",
      type: "OPEN_TIMELINE",
      title: "Timeline",
      description: "Abrir",
      payload: {},
    });
    const diff = created.expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(14 * 60_000);
    expect(diff).toBeLessThanOrEqual(16 * 60_000);
  });

  it("reutiliza proposta PENDING equivalente não expirada", async () => {
    const existing = makeProposal({ id: "existing" });
    repo._setPendingByFingerprint(existing);

    const created = await service.createProposal({
      userId: "user-1",
      type: "OPEN_ALERT",
      title: "Abrir alerta",
      description: "Deseja abrir?",
      payload: { alertId: "alert-1" },
    });
    expect(created.id).toBe("existing");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("approveProposal falha se expirada", async () => {
    const expired = makeProposal({
      expiresAt: new Date(Date.now() - 1000),
    });
    repo._store.set(expired.id, expired);
    repo.findByIdForUser.mockResolvedValue(expired);

    await expect(service.approveProposal("user-1", expired.id)).rejects.toMatchObject({
      code: "EXPIRED",
    });
  });

  it("rejectProposal marca REJECTED", async () => {
    const p = makeProposal();
    repo._store.set(p.id, p);
    const updated = await service.rejectProposal("user-1", p.id);
    expect(updated.status).toBe("REJECTED");
  });

  it("executeProposal exige APPROVED e retorna navegação", async () => {
    const p = makeProposal({ status: "APPROVED", approvedAt: new Date() });
    repo._store.set(p.id, p);

    const { result, proposal } = await service.executeProposal("user-1", p.id);
    expect(result.status).toBe("EXECUTED");
    expect(result.targetUrl).toContain("/dashboard/notifications?type=alert");
    expect(proposal.status).toBe("EXECUTED");
  });

  it("expirePendingProposals marca EXPIRED", async () => {
    const p = makeProposal({
      expiresAt: new Date(Date.now() - 60_000),
    });
    repo._store.set(p.id, p);
    repo.expirePendingForUser.mockResolvedValue(1);

    const count = await service.expirePendingProposals("user-1");
    expect(count).toBe(1);
  });

  it("getProposal retorna NOT_FOUND para outro usuário", async () => {
    const p = makeProposal({ userId: "other" });
    repo._store.set(p.id, p);
    await expect(service.getProposal("user-1", p.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
