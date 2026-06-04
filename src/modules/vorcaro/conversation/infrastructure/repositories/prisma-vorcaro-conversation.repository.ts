import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  VorcaroConversationChannel,
  VorcaroConversationRecord,
  VorcaroMessageRecord,
  VorcaroMessageRole,
} from "../../domain/types/vorcaro-conversation";

function toConversation(row: {
  id: string;
  userId: string;
  channel: string;
  title: string | null;
  activeTopic: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VorcaroConversationRecord {
  return {
    id: row.id,
    userId: row.userId,
    channel: row.channel as VorcaroConversationChannel,
    title: row.title,
    activeTopic: row.activeTopic,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMessage(row: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: Date;
}): VorcaroMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as VorcaroMessageRole,
    content: row.content,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    createdAt: row.createdAt,
  };
}

export class PrismaVorcaroConversationRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string, userId: string): Promise<VorcaroConversationRecord | null> {
    const row = await this.db.vorcaroConversation.findFirst({
      where: { id, userId },
    });
    return row ? toConversation(row) : null;
  }

  async findLatestByChannel(
    userId: string,
    channel: VorcaroConversationChannel,
  ): Promise<VorcaroConversationRecord | null> {
    const row = await this.db.vorcaroConversation.findFirst({
      where: { userId, channel },
      orderBy: { updatedAt: "desc" },
    });
    return row ? toConversation(row) : null;
  }

  async listByUser(userId: string, limit = 20): Promise<VorcaroConversationRecord[]> {
    const rows = await this.db.vorcaroConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map(toConversation);
  }

  async create(input: {
    userId: string;
    channel: VorcaroConversationChannel;
    title?: string | null;
  }): Promise<VorcaroConversationRecord> {
    const row = await this.db.vorcaroConversation.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        title: input.title ?? null,
      },
    });
    return toConversation(row);
  }

  async updateTopic(id: string, userId: string, activeTopic: string | null, title?: string) {
    const existing = await this.db.vorcaroConversation.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("CONVERSATION_NOT_FOUND");
    const row = await this.db.vorcaroConversation.update({
      where: { id },
      data: {
        activeTopic,
        ...(title != null ? { title } : {}),
        updatedAt: new Date(),
      },
    });
    return toConversation(row);
  }

  async touch(id: string, userId: string) {
    const existing = await this.db.vorcaroConversation.findFirst({ where: { id, userId } });
    if (!existing) return;
    await this.db.vorcaroConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  async addMessage(input: {
    conversationId: string;
    role: VorcaroMessageRole;
    content: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<VorcaroMessageRecord> {
    const row = await this.db.vorcaroMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return toMessage(row);
  }

  async listMessages(conversationId: string, limit = 50): Promise<VorcaroMessageRecord[]> {
    const rows = await this.db.vorcaroMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse().map(toMessage);
  }

  async countUserMessagesSince(userId: string, channel: VorcaroConversationChannel, since: Date) {
    return this.db.vorcaroMessage.count({
      where: {
        role: "USER",
        createdAt: { gte: since },
        conversation: { userId, channel },
      },
    });
  }
}
