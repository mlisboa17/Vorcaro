import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildVorcaroActionProposalService } from "@/lib/api/vorcaro-actions";
import { serializeProposal, vorcaroActionErrorResponse } from "@/lib/api/vorcaro-action-errors";
import type { VorcaroActionStatus } from "@prisma/client";

const VALID_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "FAILED",
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
    statusParam && VALID_STATUSES.includes(statusParam as VorcaroActionStatus)
      ? (statusParam as VorcaroActionStatus)
      : undefined;

  try {
    const service = buildVorcaroActionProposalService();
    const items = await service.listProposals(session.user.id, status);
    return NextResponse.json({ items: items.map(serializeProposal) });
  } catch (error) {
    return vorcaroActionErrorResponse(error);
  }
}
