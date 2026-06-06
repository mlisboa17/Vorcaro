import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatementLayoutTrainingService } from "@/modules/statement-layout-training/application/services/statement-layout-training.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const service = new StatementLayoutTrainingService(prisma);
  const result = await service.promoteToApproved(session.user.id, id, true);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const item = (await service.listModels(session.user.id)).find((m) => m.id === id);
  return NextResponse.json({ item });
}
