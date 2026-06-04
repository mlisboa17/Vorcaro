import type { PrismaClient } from "@prisma/client";

/** Histórico leve — apenas templateId, categoria, userId e timestamp. */
export type VorcaroHistoryRecord = {
  id: string;
  userId: string;
  templateId: string;
  category: string;
  usedAt: Date;
};

export class PrismaVorcaroMessageHistoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(input: {
    userId: string;
    templateId: string;
    category: string;
    usedAt?: Date;
  }): Promise<VorcaroHistoryRecord> {
    const row = await this.db.vorcaroMessageHistory.create({
      data: {
        userId: input.userId,
        templateId: input.templateId,
        category: input.category,
        usedAt: input.usedAt ?? new Date(),
      },
    });
    return row;
  }

  async findRecentByUser(userId: string, limit: number): Promise<VorcaroHistoryRecord[]> {
    return this.db.vorcaroMessageHistory.findMany({
      where: { userId },
      orderBy: { usedAt: "desc" },
      take: limit,
    });
  }

  async findUsedSince(userId: string, since: Date): Promise<VorcaroHistoryRecord[]> {
    return this.db.vorcaroMessageHistory.findMany({
      where: { userId, usedAt: { gte: since } },
      orderBy: { usedAt: "desc" },
    });
  }

  async findUsedTemplateIdsSince(userId: string, since: Date): Promise<string[]> {
    const rows = await this.findUsedSince(userId, since);
    return [...new Set(rows.map((r) => r.templateId))];
  }
}
