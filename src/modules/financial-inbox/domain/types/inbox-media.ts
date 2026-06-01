import type { InboxChannel } from "@prisma/client";

export type InboxContentType = "TEXT" | "IMAGE" | "VOICE" | "AUDIO";

export interface InboxMediaMeta {
  contentType?: InboxContentType;
  mimeType?: string;
  imageBase64?: string;
  audioBase64?: string;
  fileName?: string;
  transcriptionSource?: "gemini";
  voiceFileId?: string;
  photoFileId?: string;
  duration?: number;
}

export interface ParsedInboxMedia {
  contentType: InboxContentType;
  mimeType: string;
  base64: string;
}

const IMAGE_CHANNELS = new Set<InboxChannel>(["WEB_IMAGE", "TELEGRAM_IMAGE"]);
const VOICE_CHANNELS = new Set<InboxChannel>(["WEB_VOICE", "TELEGRAM_VOICE"]);

export function buildImagePlaceholder(source: string): string {
  return `[Comprovante enviado via ${source}]`;
}

export function buildVoicePlaceholder(source: string): string {
  return `[Áudio enviado via ${source} — aguardando transcrição]`;
}

export function parseInboxMedia(
  channel: InboxChannel,
  channelMeta: Record<string, unknown> | null,
): ParsedInboxMedia | null {
  const meta = (channelMeta ?? {}) as InboxMediaMeta;
  const contentType = meta.contentType ?? inferContentTypeFromChannel(channel);

  if (contentType === "IMAGE" && meta.imageBase64) {
    return {
      contentType: "IMAGE",
      mimeType: meta.mimeType ?? "image/jpeg",
      base64: meta.imageBase64,
    };
  }

  if ((contentType === "VOICE" || contentType === "AUDIO") && meta.audioBase64) {
    return {
      contentType,
      mimeType: meta.mimeType ?? "audio/webm",
      base64: meta.audioBase64,
    };
  }

  if (IMAGE_CHANNELS.has(channel) && meta.imageBase64) {
    return {
      contentType: "IMAGE",
      mimeType: meta.mimeType ?? "image/jpeg",
      base64: meta.imageBase64,
    };
  }

  if (VOICE_CHANNELS.has(channel) && meta.audioBase64) {
    return {
      contentType: "VOICE",
      mimeType: meta.mimeType ?? "audio/ogg",
      base64: meta.audioBase64,
    };
  }

  return null;
}

function inferContentTypeFromChannel(channel: InboxChannel): InboxContentType {
  if (IMAGE_CHANNELS.has(channel)) {
    return "IMAGE";
  }

  if (VOICE_CHANNELS.has(channel)) {
    return "VOICE";
  }

  return "TEXT";
}

export function isMediaPlaceholder(rawContent: string): boolean {
  return rawContent.startsWith("[Comprovante") || rawContent.startsWith("[Áudio");
}
