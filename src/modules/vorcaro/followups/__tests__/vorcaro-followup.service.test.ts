import { describe, expect, it, vi, beforeEach } from "vitest";
import { VorcaroFollowUpService } from "../application/services/vorcaro-followup.service";
import type { VorcaroFollowUpRecord } from "../domain/types/vorcaro-followup";
import type { PrismaVorcaroFollowUpRepository } from "../infrastructure/repositories/prisma-vorcaro-followup.repository";

function makeRecord(overrides: Partial<VorcaroFollowUpRecord> = {}): VorcaroFollowUpRecord {
  return {
    id: "fu-1",
    userId: "user-1",
    fingerprint: "RECEIVABLE:rec-1:OPEN_RECEIVABLE",
    relatedEntityId: "rec-1",
    relatedEntityType: "RECEIVABLE",
    title: "Acompanhar recebível",
    description: "Verifique o recebimento",
    status: "ACTIVE",
    nextCheckAt: new Date(),
    lastReminderAt: null,
    checkCount: 0,
    version: 0,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("VorcaroFollowUpService", () => {
  let repo: PrismaVorcaroFollowUpRepository;
  let service: VorcaroFollowUpService;

  beforeEach(() => {
    repo = {
      findByFingerprint: vi.fn(),
      create: vi.fn(),
      completeByEntity: vi.fn(),
      list: vi.fn(),
      findByIdForUser: vi.fn(),
      updateWithVersion: vi.fn(),
      listDueActive: vi.fn(),
    } as unknown as PrismaVorcaroFollowUpRepository;
    service = new VorcaroFollowUpService(repo);
  });

  it("bloqueia duplicidade por fingerprint quando já existe pendência ativa", async () => {
    const existing = makeRecord();
    vi.mocked(repo.findByFingerprint).mockResolvedValue(existing);

    const result = await service.createFromExecutedAction({
      userId: "user-1",
      proposalId: "prop-1",
      actionType: "OPEN_RECEIVABLE",
      title: "Acompanhar",
      description: "Desc",
      payload: { receivableId: "rec-1" },
    });

    expect(result).toBe(existing);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("cria follow-up com fingerprint determinístico", async () => {
    vi.mocked(repo.findByFingerprint).mockResolvedValue(null);
    const created = makeRecord();
    vi.mocked(repo.create).mockResolvedValue(created);

    await service.createFromExecutedAction({
      userId: "user-1",
      proposalId: "prop-1",
      actionType: "OPEN_RECEIVABLE",
      title: "Acompanhar",
      description: "Desc",
      payload: { receivableId: "rec-1" },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: "RECEIVABLE:rec-1:OPEN_RECEIVABLE",
        userId: "user-1",
        status: "ACTIVE",
      }),
    );
  });

  it("auto-complete por entidade delega ao repositório", async () => {
    vi.mocked(repo.completeByEntity).mockResolvedValue(2);

    const count = await service.completeByEntity("user-1", "GOAL", "goal-1");

    expect(count).toBe(2);
    expect(repo.completeByEntity).toHaveBeenCalledWith("user-1", "GOAL", "goal-1");
  });
});
