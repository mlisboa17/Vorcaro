import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AutomatedReportNotificationService } from "@/modules/notifications/application/services/automated-report-notification.service";

/**
 * Sprint 22.3 — Relatórios automáticos (semanal/mensal).
 * Agendamento: segunda-feira 08:00 UTC (5:00 BRT) para semanal
 *              1º do mês 08:00 UTC para mensal
 * Usa dados de WeeklySummaryService + MonthlyCommitmentsService.
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
    const service = new AutomatedReportNotificationService(prisma);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();

    const stats = { weekly: { sent: 0, failed: 0 }, monthly: { sent: 0, failed: 0 } };

    // Segunda-feira (1)
    if (dayOfWeek === 1) {
      const weeklyStats = await service.runWeeklyReports();
      stats.weekly = weeklyStats;
    }

    // 1º do mês
    if (dayOfMonth === 1) {
      const monthlyStats = await service.runMonthlyReports();
      stats.monthly = monthlyStats;
    }

    return NextResponse.json({
      ok: true,
      message: `Relatórios enviados: ${stats.weekly.sent + stats.monthly.sent} usuários`,
      stats,
    });
  } catch (error) {
    console.error("[automated-reports] Error:", error);
    return NextResponse.json(
      { error: "Falha ao enviar relatórios automáticos" },
      { status: 500 },
    );
  }
}
