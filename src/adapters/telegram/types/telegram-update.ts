import { z } from "zod";

const telegramPhotoSizeSchema = z.object({
  file_id: z.string(),
  file_size: z.number().optional(),
  width: z.number(),
  height: z.number(),
});

const telegramVoiceSchema = z.object({
  file_id: z.string(),
  mime_type: z.string().optional(),
  duration: z.number().optional(),
});

const telegramChatSchema = z.object({
  id: z.number(),
  type: z.string().optional(),
});

const telegramUserSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string().optional(),
});

const telegramDocumentSchema = z.object({
  file_id: z.string(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().optional(),
});

const telegramMessageSchema = z.object({
  message_id: z.number(),
  text: z.string().optional(),
  chat: telegramChatSchema,
  from: telegramUserSchema.optional(),
  photo: z.array(telegramPhotoSizeSchema).optional(),
  voice: telegramVoiceSchema.optional(),
  document: telegramDocumentSchema.optional(),
});

const telegramCallbackQuerySchema = z.object({
  id: z.string(),
  from: telegramUserSchema.optional(),
  data: z.string().optional(),
  message: telegramMessageSchema.optional(),
});

export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: telegramMessageSchema.optional(),
  callback_query: telegramCallbackQuerySchema.optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
export type TelegramCallbackQuery = z.infer<typeof telegramCallbackQuerySchema>;

export function parseTelegramUpdate(body: unknown): TelegramUpdate | null {
  const parsed = telegramUpdateSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export function isStartCommand(text: string): boolean {
  return text.trim().startsWith("/start");
}

export function isHelpCommand(text: string): boolean {
  return text.trim().startsWith("/help");
}

export function isHomeCommand(text: string): boolean {
  return text.trim().toLowerCase().startsWith("/home");
}

export function hasPhoto(message: TelegramMessage): boolean {
  return Boolean(message.photo?.length);
}

export function hasVoice(message: TelegramMessage): boolean {
  return Boolean(message.voice?.file_id);
}

export function hasDocument(message: TelegramMessage): boolean {
  return Boolean(message.document?.file_id);
}

export function getLargestPhotoFileId(message: TelegramMessage): string | null {
  if (!message.photo?.length) {
    return null;
  }

  const largest = message.photo[message.photo.length - 1];
  return largest.file_id;
}

/** @deprecated Use hasPhoto/hasVoice/hasDocument instead */
export function hasMedia(message: TelegramMessage): boolean {
  return hasPhoto(message) || hasVoice(message) || hasDocument(message);
}
