import { NextResponse } from "next/server";
import type { VorcaroFollowUpStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { buildVorcaroFollowUpService } from "@/lib/api/vorcaro-followups";
import { serializeFollowUp, vorcaroFollowUpErrorResponse } from "@/lib/api/vorcaro-followup-errors";

const VALID_STATUSES = [
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "DISMISSED",
  "EXPIRED",
] as const;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as VorcaroFollowUpStatus)
      ? (statusParam as VorcaroFollowUpStatus)
      : undefined;

  try {
    const service = buildVorcaroFollowUpService();
    const items = await service.listFollowUps(session.user.id, status);
    return NextResponse.json({ items: items.map(serializeFollowUp) });
  } catch (error) {
    return vorcaroFollowUpErrorResponse(error);
  }
}
