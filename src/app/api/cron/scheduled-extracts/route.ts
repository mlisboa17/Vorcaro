import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScheduledExtractNotificationService } from "@/modules/notifications/application/services/scheduled-extract-notification.service";

/**
 * Sprint 22.2 — Agendamento de extratos automáticos (semanal/mensal).
 * Agendamento: diariamente 12:00 UTC (9:00 BRT).
 * Reutiliza CSV do Sprint 21 + Telegram integrado.
 */
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

  try {
    const service = new ScheduledExtractNotificationService(prisma);
    const stats = await service.runScheduledExtracts();

    return NextResponse.json({
      ok: true,
      message: `Extratos enviados para ${stats.sent} usuários (${stats.failed} falhas)`,
      stats,
    });
  } catch (error) {
    console.error("[scheduled-extracts] Error:", error);
    return NextResponse.json(
      { error: "Falha ao enviar extratos agendados" },
      { status: 500 },
    );
  }
}
