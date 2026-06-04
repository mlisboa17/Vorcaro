import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialMemoryRepository } from "@/lib/api/financial-memory";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "30") || 30));

  const { items, total } = await buildFinancialMemoryRepository().listAchievements(
    session.user.id,
    { page, pageSize },
  );

  return NextResponse.json({
    items: items.map((a) => ({
      ...a,
      unlockedAt: a.unlockedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  });
}
