import type { VorcaroFollowUpStatus } from "@prisma/client";
import type { VorcaroActionType } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";
import { VorcaroFollowUpError } from "../../domain/errors/vorcaro-followup.error";
import { computeInitialNextCheckAt } from "../../domain/services/vorcaro-followup-backoff";
import { buildFollowUpFingerprint } from "../../domain/services/vorcaro-followup-fingerprint";
import { resolveEntityFromAction } from "../../domain/services/vorcaro-followup-entity-resolver";
import {
  VORCARO_FOLLOW_UP_TERMINAL_STATUSES,
  type VorcaroFollowUpEntityType,
  type VorcaroFollowUpRecord,
} from "../../domain/types/vorcaro-followup";
import { PrismaVorcaroFollowUpRepository } from "../../infrastructure/repositories/prisma-vorcaro-followup.repository";

export class VorcaroFollowUpService {
  constructor(private readonly repo: PrismaVorcaroFollowUpRepository) {}

  async listFollowUps(
    userId: string,
    status?: VorcaroFollowUpStatus,
  ): Promise<VorcaroFollowUpRecord[]> {
    return this.repo.list(userId, status);
  }

  async getFollowUp(userId: string, id: string): Promise<VorcaroFollowUpRecord> {
    const row = await this.repo.findByIdForUser(id, userId);
    if (!row) {
      throw new VorcaroFollowUpError("NOT_FOUND", "Pendência não encontrada.");
    }
    return row;
  }

  async dismissFollowUp(userId: string, id: string): Promise<VorcaroFollowUpRecord> {
    const current = await this.getFollowUp(userId, id);
    if (VORCARO_FOLLOW_UP_TERMINAL_STATUSES.includes(current.status)) {
      throw new VorcaroFollowUpError(
        "INVALID_STATUS",
        "Esta pendência já foi encerrada.",
      );
    }

    const updated = await this.repo.updateWithVersion(id, userId, current.version, {
      status: "DISMISSED",
    });
    if (!updated) {
      throw new VorcaroFollowUpError("OPTIMISTIC_LOCK", "Conflito de atualização. Tente novamente.");
    }
    return updated;
  }

  async createFromExecutedAction(input: {
    userId: string;
    proposalId: string;
    actionType: VorcaroActionType;
    title: string;
    description: string;
    payload: Record<string, unknown>;
  }): Promise<VorcaroFollowUpRecord | null> {
    const { relatedEntityType, relatedEntityId } = resolveEntityFromAction(
      input.actionType,
      input.payload,
    );
    const fingerprint = buildFollowUpFingerprint(
      relatedEntityType,
      relatedEntityId,
      input.actionType,
    );

    const existing = await this.repo.findByFingerprint(input.userId, fingerprint);
    if (existing && !VORCARO_FOLLOW_UP_TERMINAL_STATUSES.includes(existing.status)) {
      return existing;
    }

    const now = new Date();
    try {
      return await this.repo.create({
        userId: input.userId,
        fingerprint,
        relatedEntityType,
        relatedEntityId,
        title: input.title,
        description: input.description,
        status: "ACTIVE",
        nextCheckAt: computeInitialNextCheckAt(now),
        metadata: {
          proposalId: input.proposalId,
          actionType: input.actionType,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const dup = await this.repo.findByFingerprint(input.userId, fingerprint);
        return dup;
      }
      throw error;
    }
  }

  async completeByEntity(
    userId: string,
    entityType: VorcaroFollowUpEntityType,
    entityId: string,
  ): Promise<number> {
    return this.repo.completeByEntity(userId, entityType, entityId);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
