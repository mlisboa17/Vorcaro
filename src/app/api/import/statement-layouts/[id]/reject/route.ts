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
  const ok = await service.rejectModel(session.user.id, id);
  if (!ok) return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });

  const item = (await service.listModels(session.user.id)).find((m) => m.id === id);
  return NextResponse.json({ item });
}
