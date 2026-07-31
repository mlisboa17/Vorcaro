import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SpendingAnomalyDetectionService } from "@/modules/notifications/application/services/spending-anomaly-detection.service";

/**
 * Sprint 23.2 — Detecção de anomalias de gastos.
 * Agendamento: diariamente 19:00 UTC (16:00 BRT) — após horário de trabalho.
 * Analisa gastos do dia e detecta desvios estatísticos.
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
    const service = new SpendingAnomalyDetectionService(prisma);
    const stats = await service.runForAllUsers();

    return NextResponse.json({
      ok: true,
      message: `Verificados ${stats.checked} usuários (${stats.anomalies} anomalias detectadas)`,
      stats,
    });
  } catch (error) {
    console.error("[spending-anomalies] Error:", error);
    return NextResponse.json(
      { error: "Falha ao detectar anomalias de gasto" },
      { status: 500 },
    );
  }
}
