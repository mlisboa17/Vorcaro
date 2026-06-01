import { z } from "zod";
import { inboxImportMetadataSchema } from "@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const inboxJsonBodySchema = z
  .object({
    rawContent: z.string().optional(),
    contentType: z.enum(["TEXT", "IMAGE", "VOICE", "AUDIO"]).optional(),
    imageBase64: z.string().optional(),
    audioBase64: z.string().optional(),
    mimeType: z.string().optional(),
    fileName: z.string().optional(),
    channelMeta: z.record(z.unknown()).optional(),
    metadata: inboxImportMetadataSchema.optional(),
  })
  .strict();

export type InboxJsonBody = z.infer<typeof inboxJsonBodySchema>;

export function parseInboxJsonBody(body: unknown): InboxJsonBody {
  return inboxJsonBodySchema.parse(body);
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function assertPayloadSize(base64: string, maxBytes: number, label: string): void {
  const size = estimateBase64Bytes(base64);
  if (size > maxBytes) {
    throw new Error(`${label} excede o limite de ${Math.round(maxBytes / (1024 * 1024))}MB`);
  }
}

export async function parseMultipartInboxPayload(formData: FormData): Promise<InboxJsonBody> {
  const contentType = String(formData.get("contentType") ?? "TEXT");
  const rawContent = formData.get("rawContent");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Arquivo multipart ausente (campo file)");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (contentType === "IMAGE") {
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Imagem excede o limite de 5MB");
    }

    return {
      contentType: "IMAGE",
      rawContent: typeof rawContent === "string" ? rawContent : undefined,
      imageBase64: bufferToBase64(buffer),
      mimeType: file.type || "image/jpeg",
      fileName: file.name,
    };
  }

  if (contentType === "VOICE" || contentType === "AUDIO") {
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      throw new Error("Áudio excede o limite de 2MB");
    }

    return {
      contentType: contentType === "AUDIO" ? "AUDIO" : "VOICE",
      rawContent: typeof rawContent === "string" ? rawContent : undefined,
      audioBase64: bufferToBase64(buffer),
      mimeType: file.type || "audio/webm",
      fileName: file.name,
    };
  }

  throw new Error("contentType multipart inválido");
}

export function normalizeJsonInboxPayload(payload: InboxJsonBody): InboxJsonBody {
  const contentType = payload.contentType ?? (payload.rawContent ? "TEXT" : undefined);

  if (!contentType) {
    throw new Error("contentType ou rawContent é obrigatório");
  }

  if (contentType === "IMAGE") {
    if (!payload.imageBase64) {
      throw new Error("imageBase64 é obrigatório para contentType IMAGE");
    }
    assertPayloadSize(payload.imageBase64, MAX_IMAGE_BYTES, "Imagem");
  }

  if (contentType === "VOICE" || contentType === "AUDIO") {
    if (!payload.audioBase64) {
      throw new Error("audioBase64 é obrigatório para contentType VOICE/AUDIO");
    }
    assertPayloadSize(payload.audioBase64, MAX_AUDIO_BYTES, "Áudio");
  }

  if (contentType === "TEXT" && !payload.rawContent?.trim()) {
    throw new Error("rawContent is required for text ingestion");
  }

  return { ...payload, contentType };
}
