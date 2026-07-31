import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisConnection } from "@/lib/queue";
import { WeeklySummaryService } from "@/modules/reports/application/services/weekly-summary.service";
import { buildSummaryView } from "@/lib/telegram/summary";
import { sendTelegramMessageWithMode } from "@/lib/telegram/telegram-bot.client";

/** ISO year-week para idempotência semanal (não reenviar o mesmo resumo). */
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const connections = await prisma.telegramConnection.findMany({
    where: { isActive: true },
    select: { userId: true, telegramChatId: true },
  });

  const redis = getRedisConnection();
  const week = isoWeekKey();
  const summaryService = new WeeklySummaryService(prisma);
  let sent = 0;
  let skipped = 0;

  for (const conn of connections) {
    const dedupKey = `telegram:weekly-sent:${conn.userId}:${week}`;
    try {
      const isNew = await redis.setnx(dedupKey, "1");
      if (isNew === 0) {
        skipped += 1;
        continue;
      }
      await redis.expire(dedupKey, 60 * 60 * 24 * 8); // 8 dias

      const summary = await summaryService.build(conn.userId, 7);
      if (summary.transactionCount === 0) {
        skipped += 1;
        continue; // não incomoda quem não movimentou nada
      }
      const view = buildSummaryView(summary);
      await sendTelegramMessageWithMode(Number(conn.telegramChatId), view.text, "HTML", {
        inline_keyboard: view.keyboard,
      });
      sent += 1;
    } catch (error) {
      console.error("[cron/weekly-summary] falha para usuário", conn.userId, error);
    }
  }

  return NextResponse.json({ usersProcessed: connections.length, sent, skipped });
}

// Vercel Cron dispara via GET; mantemos POST para chamadas manuais.
export const GET = handle;
export const POST = handle;
