import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancialAlertQueryService } from "@/modules/financial-alerts/application/services/financial-alert-query.service";
import { bulkPatchAlertsSchema } from "@/types/financial-alerts";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bulkPatchAlertsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = new FinancialAlertQueryService(prisma);
  const count = await service.bulkPatch(
    session.user.id,
    parsed.data.ids,
    parsed.data.status,
  );

  return NextResponse.json({ updated: count });
}
