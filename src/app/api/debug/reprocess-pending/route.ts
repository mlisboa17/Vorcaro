import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processFinancialInboxItem } from "@/lib/queue/process-financial-inbox-item";

function isAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("x-debug-secret") === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.financialInbox.findMany({
    where: { status: "PENDING" },
    select: { id: true, userId: true, rawContent: true },
  });

  const results: Array<{ id: string; rawContent: string; ok: boolean; error?: string }> = [];

  for (const item of pending) {
    try {
      await processFinancialInboxItem(item.id, item.userId);
      results.push({ id: item.id, rawContent: item.rawContent, ok: true });
    } catch (error) {
      results.push({
        id: item.id,
        rawContent: item.rawContent,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ total: pending.length, results });
}
