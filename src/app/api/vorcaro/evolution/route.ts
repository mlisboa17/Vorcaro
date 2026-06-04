import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancialMemoryQueryService } from "@/modules/financial-memory/application/services/financial-memory-query.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new FinancialMemoryQueryService(prisma);
  await query.refresh(session.user.id);
  const data = await query.getEvolution(session.user.id);

  return NextResponse.json(data);
}
