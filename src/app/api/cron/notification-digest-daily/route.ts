import { NextResponse } from "next/server";
import { buildNotificationDigest } from "@/lib/api/notifications";

/** Agendamento diário 08:00 — Authorization: Bearer CRON_SECRET */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const digest = buildNotificationDigest();
  const results = await digest.runDailyForAllUsers();
  return NextResponse.json({
    usersProcessed: results.length,
    digestsCreated: results.filter((r) => r.dailyCreated).length,
    telegramSent: results.filter((r) => r.telegramSent).length,
  });
}
