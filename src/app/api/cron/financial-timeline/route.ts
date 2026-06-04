import { NextResponse } from "next/server";
import { buildFinancialTimelineEngine } from "@/lib/api/financial-memory";

/** Cron diário — Authorization: Bearer CRON_SECRET */
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

  const stats = await buildFinancialTimelineEngine().runForAllUsers();
  return NextResponse.json(stats);
}
