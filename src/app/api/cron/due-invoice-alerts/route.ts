import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DueInvoiceNotificationService } from "@/modules/notifications/application/services/due-invoice-notification.service";

/**
 * Sprint 22.1 — Notificações de faturas vencendo (próximos 3 dias).
 * Agendamento: diariamente 06:00 UTC (3:00 BRT).
 * Protegido por CRON_SECRET no header Authorization.
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
    const service = new DueInvoiceNotificationService(prisma);
    const stats = await service.runForAllUsers(3); // próximos 3 dias

    return NextResponse.json({
      ok: true,
      message: `Notificações enviadas para ${stats.notified} usuários (${stats.alerts} alertas)`,
      stats,
    });
  } catch (error) {
    console.error("[due-invoice-alerts] Error:", error);
    return NextResponse.json(
      { error: "Falha ao processar notificações de faturas" },
      { status: 500 },
    );
  }
}
