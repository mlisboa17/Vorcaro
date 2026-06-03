import { NextResponse } from "next/server";
import { buildFinancialAlertEngine } from "@/lib/api/financial-alerts";

/**
 * Agendamento diário 0 6 * * * — chamar via cron externo ou script npm.
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

  const engine = buildFinancialAlertEngine();
  const stats = await engine.runForAllUsers();

  return NextResponse.json(stats);
}
