import type { InboxChannel } from "@prisma/client";
import {
  buildImagePlaceholder,
  type InboxMediaMeta,
} from "@/modules/financial-inbox/domain/types/inbox-media";

interface TelegramBaseMeta {
  chatId: number;
  messageId: number;
  username?: string;
}

export interface TelegramTextPayload extends TelegramBaseMeta {
  rawContent: string;
}

export interface TelegramVoicePayload extends TelegramBaseMeta {
  rawContent: string;
  voiceFileId: string;
  duration?: number;
}

export interface TelegramImagePayload extends TelegramBaseMeta {
  imageBase64: string;
  mimeType: string;
  photoFileId: string;
}

export function toTelegramTextIngestInput(userId: string, payload: TelegramTextPayload) {
  return {
    userId,
    channel: "TELEGRAM" as InboxChannel,
    rawContent: payload.rawContent,
    channelMeta: {
      chatId: payload.chatId,
      messageId: payload.messageId,
      username: payload.username,
      contentType: "TEXT",
    },
  };
}

export function toTelegramVoiceIngestInput(userId: string, payload: TelegramVoicePayload) {
  return {
    userId,
    channel: "TELEGRAM_VOICE" as InboxChannel,
    rawContent: payload.rawContent,
    channelMeta: {
      chatId: payload.chatId,
      messageId: payload.messageId,
      username: payload.username,
      contentType: "VOICE",
      voiceFileId: payload.voiceFileId,
      duration: payload.duration,
      transcriptionSource: "gemini",
    } satisfies InboxMediaMeta & TelegramBaseMeta,
  };
}

export function toTelegramImageIngestInput(userId: string, payload: TelegramImagePayload) {
  return {
    userId,
    channel: "TELEGRAM_IMAGE" as InboxChannel,
    rawContent: buildImagePlaceholder("Telegram"),
    channelMeta: {
      chatId: payload.chatId,
      messageId: payload.messageId,
      username: payload.username,
      contentType: "IMAGE",
      mimeType: payload.mimeType,
      imageBase64: payload.imageBase64,
      photoFileId: payload.photoFileId,
    } satisfies InboxMediaMeta & TelegramBaseMeta,
  };
}

/** @deprecated Use toTelegramTextIngestInput */
export function toIngestInput(userId: string, payload: TelegramTextPayload) {
  return toTelegramTextIngestInput(userId, payload);
}
