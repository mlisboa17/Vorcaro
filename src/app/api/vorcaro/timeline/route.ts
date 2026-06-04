import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildFinancialMemoryRepository,
  buildFinancialTimelineEngine,
} from "@/lib/api/financial-memory";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "30") || 30));

  const userId = session.user.id;
  await buildFinancialTimelineEngine().runForUser(userId);

  const repo = buildFinancialMemoryRepository();
  const { items, total } = await repo.listTimelineEvents(userId, { page, pageSize });
  const first = await repo.getFirstSnapshotDate(userId);
  const historyDays = first
    ? Math.max(0, Math.floor((Date.now() - first.getTime()) / 86400000))
    : 0;

  return NextResponse.json({
    events: items.map((e) => ({
      ...e,
      eventDate: e.eventDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    historyDaysAvailable: historyDays,
    hasSufficientHistory: historyDays >= 30,
  });
}
