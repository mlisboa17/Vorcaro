import type { Prisma } from "@prisma/client";

/**
 * Normaliza channelMeta vindo do Prisma (JsonValue) para uso na camada de aplicação.
 */
export function parseChannelMeta(
  value: Prisma.JsonValue | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}
