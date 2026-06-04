import type { Prisma, PrismaClient, VorcaroFollowUpStatus } from "@prisma/client";
import type {
  CreateVorcaroFollowUpInput,
  VorcaroFollowUpRecord,
} from "../../domain/types/vorcaro-followup";

function mapRow(row: {
  id: string;
  userId: string;
  fingerprint: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  title: string;
  description: string;
  status: VorcaroFollowUpStatus;
  nextCheckAt: Date;
  lastReminderAt: Date | null;
  checkCount: number;
  version: number;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): VorcaroFollowUpRecord {
  return {
    id: row.id,
    userId: row.userId,
    fingerprint: row.fingerprint,
    relatedEntityId: row.relatedEntityId,
    relatedEntityType: row.relatedEntityType,
    title: row.title,
    description: row.description,
    status: row.status,
    nextCheckAt: row.nextCheckAt,
    lastReminderAt: row.lastReminderAt,
    checkCount: row.checkCount,
    version: row.version,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaVorcaroFollowUpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByIdForUser(id: string, userId: string): Promise<VorcaroFollowUpRecord | null> {
    const row = await this.prisma.vorcaroFollowUp.findFirst({ where: { id, userId } });
    return row ? mapRow(row) : null;
  }

  async findByFingerprint(userId: string, fingerprint: string): Promise<VorcaroFollowUpRecord | null> {
    const row = await this.prisma.vorcaroFollowUp.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
    });
    return row ? mapRow(row) : null;
  }

  async list(
    userId: string,
    status?: VorcaroFollowUpStatus,
  ): Promise<VorcaroFollowUpRecord[]> {
    const rows = await this.prisma.vorcaroFollowUp.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ status: "asc" }, { nextCheckAt: "asc" }],
    });
    return rows.map(mapRow);
  }

  async listDueActive(now: Date, limit = 100): Promise<VorcaroFollowUpRecord[]> {
    const rows = await this.prisma.vorcaroFollowUp.findMany({
      where: {
        status: "ACTIVE",
        nextCheckAt: { lte: now },
      },
      orderBy: { nextCheckAt: "asc" },
      take: limit,
    });
    return rows.map(mapRow);
  }

  async create(input: CreateVorcaroFollowUpInput): Promise<VorcaroFollowUpRecord> {
    const row = await this.prisma.vorcaroFollowUp.create({
      data: {
        userId: input.userId,
        fingerprint: input.fingerprint,
        relatedEntityId: input.relatedEntityId ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        title: input.title,
        description: input.description,
        status: input.status ?? "ACTIVE",
        nextCheckAt: input.nextCheckAt,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return mapRow(row);
  }

  async updateWithVersion(
    id: string,
    userId: string,
    version: number,
    data: Prisma.VorcaroFollowUpUpdateInput,
  ): Promise<VorcaroFollowUpRecord | null> {
    const result = await this.prisma.vorcaroFollowUp.updateMany({
      where: { id, userId, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) return null;
    return this.findByIdForUser(id, userId);
  }

  async completeByEntity(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const result = await this.prisma.vorcaroFollowUp.updateMany({
      where: {
        userId,
        relatedEntityType: entityType,
        relatedEntityId: entityId,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      data: { status: "COMPLETED" },
    });
    return result.count;
  }
}
