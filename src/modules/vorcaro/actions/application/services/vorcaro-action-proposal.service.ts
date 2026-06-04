import type { Prisma, VorcaroActionStatus } from "@prisma/client";
import { VorcaroActionError } from "../../domain/errors/vorcaro-action.error";
import { withFingerprintPayload } from "../../domain/services/vorcaro-action-fingerprint";
import {
  VORCARO_ACTION_CREATE_RATE_LIMIT_PER_HOUR,
  VORCARO_ACTION_EXPIRATION_MINUTES,
  VORCARO_ACTION_MUTATION_RATE_LIMIT_PER_HOUR,
  VORCARO_ACTION_TYPES,
  type CreateVorcaroActionProposalInput,
  type VorcaroActionExecutionResult,
  type VorcaroActionProposalRecord,
  type VorcaroActionType,
} from "../../domain/types/vorcaro-action";
import { PrismaVorcaroActionProposalRepository } from "../../infrastructure/repositories/prisma-vorcaro-action-proposal.repository";
import { getVorcaroActionExecutedHandler } from "@/lib/api/vorcaro-followups";
import { VorcaroActionExecutorService } from "./vorcaro-action-executor.service";
import { vorcaroActionObservability } from "./vorcaro-action-observability.service";

export class VorcaroActionProposalService {
  private readonly executor = new VorcaroActionExecutorService();

  constructor(private readonly repo: PrismaVorcaroActionProposalRepository) {}

  async createProposal(input: CreateVorcaroActionProposalInput): Promise<VorcaroActionProposalRecord> {
    this.assertValidActionType(input.type);
    await this.assertCreateRateLimit(input.userId);
    await this.expirePendingProposals(input.userId);

    const payload = withFingerprintPayload(input.type, input.payload);
    const fingerprint = String(payload.fingerprint);

    const existing = await this.repo.findPendingByFingerprint(
      input.userId,
      input.type,
      fingerprint,
    );
    if (existing) {
      vorcaroActionObservability.recordReused();
      return existing;
    }

    const expiresAt = new Date(Date.now() + VORCARO_ACTION_EXPIRATION_MINUTES * 60_000);
    const created = await this.repo.create({
      userId: input.userId,
      actionType: input.type,
      title: input.title,
      description: input.description,
      payload: payload as Prisma.InputJsonValue,
      expiresAt,
    });
    vorcaroActionObservability.recordCreated();
    return created;
  }

  async getProposal(userId: string, id: string): Promise<VorcaroActionProposalRecord> {
    const proposal = await this.repo.findByIdForUser(id, userId);
    if (!proposal) {
      throw new VorcaroActionError("NOT_FOUND", "Proposta não encontrada.");
    }
    return this.refreshExpirationState(proposal);
  }

  async listProposals(
    userId: string,
    status?: VorcaroActionStatus,
  ): Promise<VorcaroActionProposalRecord[]> {
    await this.expirePendingProposals(userId);
    const items = await this.repo.list(userId, status);
    return Promise.all(items.map((p) => this.refreshExpirationState(p)));
  }

  async approveProposal(userId: string, id: string): Promise<VorcaroActionProposalRecord> {
    await this.assertMutationRateLimit(userId);
    const proposal = await this.getProposal(userId, id);
    this.assertPendingNotExpired(proposal);

    if (proposal.status !== "PENDING") {
      throw new VorcaroActionError(
        "INVALID_STATUS",
        "Somente propostas pendentes podem ser aprovadas.",
      );
    }

    const updated = await this.repo.update(id, {
      status: "APPROVED",
      approvedAt: new Date(),
    });
    vorcaroActionObservability.recordApproved();
    return updated;
  }

  async rejectProposal(userId: string, id: string): Promise<VorcaroActionProposalRecord> {
    await this.assertMutationRateLimit(userId);
    const proposal = await this.getProposal(userId, id);

    if (proposal.status !== "PENDING") {
      throw new VorcaroActionError(
        "INVALID_STATUS",
        "Somente propostas pendentes podem ser rejeitadas.",
      );
    }

    const updated = await this.repo.update(id, {
      status: "REJECTED",
    });
    vorcaroActionObservability.recordRejected();
    return updated;
  }

  async executeProposal(
    userId: string,
    id: string,
  ): Promise<{ proposal: VorcaroActionProposalRecord; result: VorcaroActionExecutionResult }> {
    await this.assertMutationRateLimit(userId);
    const proposal = await this.getProposal(userId, id);

    if (proposal.status !== "APPROVED") {
      throw new VorcaroActionError(
        "INVALID_STATUS",
        "Somente propostas aprovadas podem ser executadas.",
      );
    }

    const execution = this.executor.execute(proposal);
    const now = new Date();

    if (execution.status === "EXECUTED") {
      const updated = await this.repo.update(id, {
        status: "EXECUTED",
        executedAt: now,
        failureReason: null,
      });
      vorcaroActionObservability.recordExecuted();
      await getVorcaroActionExecutedHandler().onActionExecuted({
        userId: proposal.userId,
        proposalId: proposal.id,
        actionType: proposal.actionType,
        title: proposal.title,
        description: proposal.description,
        payload: proposal.payload,
      });
      return { proposal: updated, result: execution };
    }

    const updated = await this.repo.update(id, {
      status: "FAILED",
      failedAt: now,
      failureReason: execution.message,
    });
    vorcaroActionObservability.recordFailed();
    return { proposal: updated, result: execution };
  }

  async approveAndExecute(
    userId: string,
    id: string,
  ): Promise<{ proposal: VorcaroActionProposalRecord; result: VorcaroActionExecutionResult }> {
    await this.approveProposal(userId, id);
    return this.executeProposal(userId, id);
  }

  async expirePendingProposals(userId?: string): Promise<number> {
    const count = userId
      ? await this.repo.expirePendingForUser(userId)
      : await this.repo.expireAllPending();
    if (count > 0) {
      vorcaroActionObservability.recordExpired(count);
    }
    return count;
  }

  private async refreshExpirationState(
    proposal: VorcaroActionProposalRecord,
  ): Promise<VorcaroActionProposalRecord> {
    if (
      proposal.status === "PENDING" &&
      proposal.expiresAt.getTime() <= Date.now()
    ) {
      const updated = await this.repo.update(proposal.id, { status: "EXPIRED" });
      vorcaroActionObservability.recordExpired();
      return updated;
    }
    return proposal;
  }

  private assertPendingNotExpired(proposal: VorcaroActionProposalRecord): void {
    if (proposal.status === "EXPIRED") {
      throw new VorcaroActionError("EXPIRED", "Esta proposta expirou.");
    }
    if (
      proposal.status === "PENDING" &&
      proposal.expiresAt.getTime() <= Date.now()
    ) {
      throw new VorcaroActionError("EXPIRED", "Esta proposta expirou.");
    }
  }

  private assertValidActionType(type: string): asserts type is VorcaroActionType {
    if (!VORCARO_ACTION_TYPES.includes(type as VorcaroActionType)) {
      throw new VorcaroActionError("INVALID_ACTION_TYPE", "Tipo de ação inválido.");
    }
  }

  private async assertCreateRateLimit(userId: string): Promise<void> {
    const since = new Date(Date.now() - 3600_000);
    const count = await this.repo.countCreatesSince(userId, since);
    if (count >= VORCARO_ACTION_CREATE_RATE_LIMIT_PER_HOUR) {
      throw new VorcaroActionError(
        "RATE_LIMIT_EXCEEDED",
        "Limite de criação de propostas atingido.",
      );
    }
  }

  private async assertMutationRateLimit(userId: string): Promise<void> {
    const since = new Date(Date.now() - 3600_000);
    const count = await this.repo.countMutationsSince(userId, since);
    if (count >= VORCARO_ACTION_MUTATION_RATE_LIMIT_PER_HOUR) {
      throw new VorcaroActionError(
        "RATE_LIMIT_EXCEEDED",
        "Limite de operações em propostas atingido.",
      );
    }
  }
}
