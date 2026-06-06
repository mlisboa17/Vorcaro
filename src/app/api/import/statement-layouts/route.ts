import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatementLayoutTrainingService } from "@/modules/statement-layout-training/application/services/statement-layout-training.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new StatementLayoutTrainingService(prisma);
  const items = await service.listModels(session.user.id);
  return NextResponse.json({ items });
}
