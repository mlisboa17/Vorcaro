import { createHash } from "crypto";
import type { TransactionMethod } from "@prisma/client";

function normalizePart(value: string | number | undefined | null): string {
  if (value == null) return "";
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function formatDate(date?: Date): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function buildDocumentFingerprint(input: {
  userId: string;
  method: TransactionMethod;
  amount?: number;
  date?: Date;
  documentNumber?: string;
  pixKey?: string;
  barcode?: string;
  bank?: string;
  supplier?: string;
}): string {
  const parts: string[] = [input.method, input.userId];

  switch (input.method) {
    case "PIX":
      parts.push(
        normalizePart(input.amount),
        formatDate(input.date),
        normalizePart(input.documentNumber),
        normalizePart(input.pixKey),
      );
      break;
    case "TRANSFERENCIA":
      parts.push(
        normalizePart(input.amount),
        formatDate(input.date),
        normalizePart(input.documentNumber),
        normalizePart(input.bank),
      );
      break;
    case "BOLETO":
      parts.push(
        normalizePart(input.amount),
        formatDate(input.date),
        normalizePart(input.barcode),
      );
      break;
    case "CARTAO_CREDITO":
      parts.push(
        normalizePart(input.amount),
        formatDate(input.date),
        normalizePart(input.supplier),
      );
      break;
    default:
      parts.push(
        normalizePart(input.amount),
        formatDate(input.date),
        normalizePart(input.supplier ?? input.documentNumber),
      );
  }

  const raw = parts.join(":");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function buildUploadFingerprint(userId: string, fileName: string, fileSize: number, buffer: Buffer): string {
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  return createHash("sha256")
    .update(`${userId}:${fileName}:${fileSize}:${hash}`)
    .digest("hex")
    .slice(0, 32);
}
