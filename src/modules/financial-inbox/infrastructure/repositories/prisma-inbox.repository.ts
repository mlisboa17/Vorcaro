import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  CreateInboxItemInput,
  InboxItemRecord,
  InboxRepositoryPort,
} from "../../domain/ports/inbox-repository.port";
import type { InboxStatus } from "@prisma/client";
import { parseChannelMeta } from "../../domain/schemas/inbox-channel-meta.schema";
import { parseInboxImportMetadata } from "../../domain/schemas/inbox-import-metadata.schema";

type FinancialInboxRow = {
  id: string;
  userId: string;
  status: InboxStatus;
  channel: InboxItemRecord["channel"];
  rawContent: string;
  channelMeta: Prisma.JsonValue | null;
  metadata?: Prisma.JsonValue | null;
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(item: FinancialInboxRow): InboxItemRecord {
  return {
    id: item.id,
    userId: item.userId,
    status: item.status,
    channel: item.channel,
    rawContent: item.rawContent,
    channelMeta: parseChannelMeta(item.channelMeta),
    metadata: parseInboxImportMetadata(item.metadata ?? null),
    errorMessage: item.errorMessage,
    processedAt: item.processedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class PrismaInboxRepository implements InboxRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async save(input: CreateInboxItemInput): Promise<{ id: string }> {
    const item = await this.db.financialInbox.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        rawContent: input.rawContent,
        status: "PENDING",
        channelMeta: input.channelMeta as Prisma.InputJsonValue | undefined,
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
      select: { id: true },
    });

    return { id: item.id };
  }

  async findById(id: string): Promise<InboxItemRecord | null> {
    const item = await this.db.financialInbox.findUnique({ where: { id } });
    return item ? toRecord(item) : null;
  }

  async listByUserId(
    userId: string,
    filters: { status?: InboxStatus; limit?: number; offset?: number } = {},
  ) {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);

    const where = {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.financialInbox.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.financialInbox.count({ where }),
    ]);

    return {
      items: items.map((item) => toRecord(item)),
      total,
    };
  }

  async updateStatus(id: string, status: InboxStatus, errorMessage?: string): Promise<void> {
    await this.db.financialInbox.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        processedAt:
          status === "READY" || status === "ERROR" || status === "SAVED" ? new Date() : undefined,
      },
    });
  }
}
