import { NextResponse } from "next/server";
import { VorcaroActionError } from "@/modules/vorcaro/actions/domain/errors/vorcaro-action.error";
import { buildNavigationTarget } from "@/modules/vorcaro/actions/domain/services/vorcaro-action-navigation";
import type { VorcaroActionType } from "@/modules/vorcaro/actions/domain/types/vorcaro-action";

export function vorcaroActionErrorResponse(error: unknown): NextResponse {
  if (error instanceof VorcaroActionError) {
    const status =
      error.code === "NOT_FOUND" || error.code === "FORBIDDEN"
        ? 404
        : error.code === "RATE_LIMIT_EXCEEDED"
            ? 429
            : error.code === "EXPIRED"
              ? 410
              : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  throw error;
}

export function serializeProposal(p: {
  id: string;
  userId: string;
  actionType: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: string;
  approvedAt: Date | null;
  executedAt: Date | null;
  failedAt: Date | null;
  expiresAt: Date;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const targetUrl =
    p.status === "EXECUTED"
      ? buildNavigationTarget(p.actionType as VorcaroActionType, p.payload).targetUrl
      : undefined;

  return {
    id: p.id,
    userId: p.userId,
    actionType: p.actionType,
    title: p.title,
    description: p.description,
    payload: p.payload,
    status: p.status,
    approvedAt: p.approvedAt?.toISOString() ?? null,
    executedAt: p.executedAt?.toISOString() ?? null,
    failedAt: p.failedAt?.toISOString() ?? null,
    expiresAt: p.expiresAt.toISOString(),
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    targetUrl,
  };
}
