import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildVorcaroActionProposalService } from "@/lib/api/vorcaro-actions";
import { serializeProposal, vorcaroActionErrorResponse } from "@/lib/api/vorcaro-action-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const service = buildVorcaroActionProposalService();
    const proposal = await service.approveProposal(session.user.id, id);
    return NextResponse.json(serializeProposal(proposal));
  } catch (error) {
    return vorcaroActionErrorResponse(error);
  }
}
