import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildVorcaroFollowUpService } from "@/lib/api/vorcaro-followups";
import { serializeFollowUp, vorcaroFollowUpErrorResponse } from "@/lib/api/vorcaro-followup-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const service = buildVorcaroFollowUpService();
    const updated = await service.dismissFollowUp(session.user.id, id);
    return NextResponse.json(serializeFollowUp(updated));
  } catch (error) {
    return vorcaroFollowUpErrorResponse(error);
  }
}
