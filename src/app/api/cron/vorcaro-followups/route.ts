import { NextResponse } from "next/server";
import { buildVorcaroFollowUpScheduler } from "@/lib/api/vorcaro-followups";

/**
 * Agendamento recomendado: 0 8 * * * — lembretes de pendências Vorcaro.
 * Protegido por CRON_SECRET no header Authorization: Bearer <secret>
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

  const scheduler = buildVorcaroFollowUpScheduler();
  const stats = await scheduler.run();

  return NextResponse.json(stats);
}
