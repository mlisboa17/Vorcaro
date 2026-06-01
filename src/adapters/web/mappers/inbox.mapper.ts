import type { InboxChannel } from "@prisma/client";
import {
  buildImagePlaceholder,
  buildVoicePlaceholder,
  type InboxContentType,
  type InboxMediaMeta,
} from "@/modules/financial-inbox/domain/types/inbox-media";

export interface WebInboxPayload {
  rawContent?: string;
  channelMeta?: Record<string, unknown>;
  metadata?: import("@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema").InboxImportMetadata;
  contentType?: InboxContentType;
  imageBase64?: string;
  audioBase64?: string;
  mimeType?: string;
  fileName?: string;
}

function resolveWebChannel(contentType: InboxContentType): InboxChannel {
  if (contentType === "IMAGE") {
    return "WEB_IMAGE";
  }

  if (contentType === "VOICE" || contentType === "AUDIO") {
    return "WEB_VOICE";
  }

  return "WEB";
}

export function toIngestInput(userId: string, payload: WebInboxPayload) {
  const contentType = payload.contentType ?? "TEXT";
  const channel = resolveWebChannel(contentType);

  const channelMeta: InboxMediaMeta & Record<string, unknown> = {
    ...(payload.channelMeta ?? {}),
    contentType,
    mimeType: payload.mimeType,
    fileName: payload.fileName,
  };

  if (payload.imageBase64) {
    channelMeta.imageBase64 = payload.imageBase64;
  }

  if (payload.audioBase64) {
    channelMeta.audioBase64 = payload.audioBase64;
  }

  let rawContent = payload.rawContent?.trim() ?? "";

  if (contentType === "IMAGE") {
    rawContent = rawContent || buildImagePlaceholder("Web");
  }

  if (contentType === "VOICE" || contentType === "AUDIO") {
    rawContent = rawContent || buildVoicePlaceholder("Web");
  }

  if (contentType === "TEXT" && !rawContent) {
    throw new Error("rawContent is required for text ingestion");
  }

  return {
    userId,
    channel,
    rawContent,
    channelMeta,
    metadata: payload.metadata,
  };
}