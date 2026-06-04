import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancialMemoryQueryService } from "@/modules/financial-memory/application/services/financial-memory-query.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "30") || 30));

  const userId = session.user.id;
  const query = new FinancialMemoryQueryService(prisma);
  await query.refresh(userId);
  const data = await query.getTimeline(userId, pageSize, page);

  return NextResponse.json({
    events: data.events.map((e) => ({
      ...e,
      eventDate: e.eventDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total: data.total,
    historyDaysAvailable: data.historyDaysAvailable,
    hasSufficientHistory: data.hasSufficientHistory,
  });
}
