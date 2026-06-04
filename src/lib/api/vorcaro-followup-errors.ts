import { NextResponse } from "next/server";
import { VorcaroFollowUpError } from "@/modules/vorcaro/followups/domain/errors/vorcaro-followup.error";
import type { VorcaroFollowUpRecord } from "@/modules/vorcaro/followups/domain/types/vorcaro-followup";

export function serializeFollowUp(row: VorcaroFollowUpRecord) {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    relatedEntityId: row.relatedEntityId,
    relatedEntityType: row.relatedEntityType,
    title: row.title,
    description: row.description,
    status: row.status,
    nextCheckAt: row.nextCheckAt.toISOString(),
    lastReminderAt: row.lastReminderAt?.toISOString() ?? null,
    checkCount: row.checkCount,
    version: row.version,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function vorcaroFollowUpErrorResponse(error: unknown) {
  if (error instanceof VorcaroFollowUpError) {
    const status =
      error.code === "NOT_FOUND" ? 404 : error.code === "OPTIMISTIC_LOCK" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
