import type { Prisma, PrismaClient, VorcaroActionStatus } from "@prisma/client";
import type { VorcaroActionProposalRecord, VorcaroActionType } from "../../domain/types/vorcaro-action";

function mapRow(row: {
  id: string;
  userId: string;
  actionType: string;
  title: string;
  description: string;
  payload: Prisma.JsonValue;
  status: VorcaroActionStatus;
  approvedAt: Date | null;
  executedAt: Date | null;
  failedAt: Date | null;
  expiresAt: Date;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VorcaroActionProposalRecord {
  return {
    id: row.id,
    userId: row.userId,
    actionType: row.actionType as VorcaroActionType,
    title: row.title,
    description: row.description,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status,
    approvedAt: row.approvedAt,
    executedAt: row.executedAt,
    failedAt: row.failedAt,
    expiresAt: row.expiresAt,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaVorcaroActionProposalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<VorcaroActionProposalRecord | null> {
    const row = await this.prisma.vorcaroActionProposal.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<VorcaroActionProposalRecord | null> {
    const row = await this.prisma.vorcaroActionProposal.findFirst({
      where: { id, userId },
    });
    return row ? mapRow(row) : null;
  }

  async findPendingByFingerprint(
    userId: string,
    actionType: string,
    fingerprint: string,
  ): Promise<VorcaroActionProposalRecord | null> {
    const now = new Date();
    const row = await this.prisma.vorcaroActionProposal.findFirst({
      where: {
        userId,
        actionType,
        status: "PENDING",
        expiresAt: { gt: now },
        payload: {
          path: ["fingerprint"],
          equals: fingerprint,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapRow(row) : null;
  }

  async findLatestPendingForUser(
    userId: string,
    maxAgeMs: number,
  ): Promise<VorcaroActionProposalRecord | null> {
    const now = new Date();
    const minCreated = new Date(now.getTime() - maxAgeMs);
    const row = await this.prisma.vorcaroActionProposal.findFirst({
      where: {
        userId,
        status: "PENDING",
        expiresAt: { gt: now },
        createdAt: { gte: minCreated },
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapRow(row) : null;
  }

  async create(data: {
    userId: string;
    actionType: string;
    title: string;
    description: string;
    payload: Prisma.InputJsonValue;
    expiresAt: Date;
  }): Promise<VorcaroActionProposalRecord> {
    const row = await this.prisma.vorcaroActionProposal.create({
      data: {
        userId: data.userId,
        actionType: data.actionType,
        title: data.title,
        description: data.description,
        payload: data.payload,
        expiresAt: data.expiresAt,
        status: "PENDING",
      },
    });
    return mapRow(row);
  }

  async update(
    id: string,
    data: Prisma.VorcaroActionProposalUpdateInput,
  ): Promise<VorcaroActionProposalRecord> {
    const row = await this.prisma.vorcaroActionProposal.update({
      where: { id },
      data,
    });
    return mapRow(row);
  }

  async list(
    userId: string,
    status?: VorcaroActionStatus,
  ): Promise<VorcaroActionProposalRecord[]> {
    const rows = await this.prisma.vorcaroActionProposal.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(mapRow);
  }

  async expirePendingForUser(userId: string): Promise<number> {
    const now = new Date();
    const result = await this.prisma.vorcaroActionProposal.updateMany({
      where: {
        userId,
        status: "PENDING",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  async expireAllPending(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.vorcaroActionProposal.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  async countMutationsSince(userId: string, since: Date): Promise<number> {
    return this.prisma.vorcaroActionProposal.count({
      where: {
        userId,
        updatedAt: { gte: since },
        status: { in: ["APPROVED", "REJECTED", "EXECUTED", "FAILED"] },
      },
    });
  }

  async countCreatesSince(userId: string, since: Date): Promise<number> {
    return this.prisma.vorcaroActionProposal.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });
  }
}
