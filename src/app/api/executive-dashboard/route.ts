import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildExecutiveDashboardService } from "@/lib/api/executive-dashboard";
import { executiveDashboardResponseSchema } from "@/types/executive-dashboard";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = buildExecutiveDashboardService();
  const payload = await service.execute(session.user.id);

  return NextResponse.json(executiveDashboardResponseSchema.parse(payload));
}
