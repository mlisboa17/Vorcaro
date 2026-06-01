import type { InboxChannel, InboxStatus } from "@prisma/client";
import type { InboxImportMetadata } from "../schemas/inbox-import-metadata.schema";

export interface CreateInboxItemInput {
  userId: string;
  channel: InboxChannel;
  rawContent: string;
  channelMeta?: Record<string, unknown>;
  metadata?: InboxImportMetadata;
}

export interface InboxItemRecord {
  id: string;
  userId: string;
  status: InboxStatus;
  channel: InboxChannel;
  rawContent: string;
  channelMeta: Record<string, unknown> | null;
  metadata: InboxImportMetadata | null;
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InboxRepositoryPort {
  save(input: CreateInboxItemInput): Promise<{ id: string }>;
  findById(id: string): Promise<InboxItemRecord | null>;
  listByUserId(userId: string, filters?: ListInboxItemsFilters): Promise<ListInboxItemsResult>;
  updateStatus(id: string, status: InboxStatus, errorMessage?: string): Promise<void>;
}

export interface ListInboxItemsFilters {
  status?: InboxStatus;
  limit?: number;
  offset?: number;
}

export interface ListInboxItemsResult {
  items: InboxItemRecord[];
  total: number;
}
