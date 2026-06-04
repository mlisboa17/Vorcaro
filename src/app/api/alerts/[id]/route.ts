import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancialAlertQueryService } from "@/modules/financial-alerts/application/services/financial-alert-query.service";
import { patchAlertSchema, serializeFinancialAlert } from "@/types/financial-alerts";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = new FinancialAlertQueryService(prisma);
  const updated = await service.patch(session.user.id, id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Alerta não encontrado" }, { status: 404 });
  }

  if (parsed.data.status === "DISMISSED") {
    console.info(
      JSON.stringify({
        scope: "financial-alert-engine",
        event: "alert_dismissed",
        userId: session.user.id,
        alertId: id,
        at: new Date().toISOString(),
      }),
    );
  }

  if (parsed.data.status === "RESOLVED") {
    const { getVorcaroEntityStateChangedHandler } = await import("@/lib/api/vorcaro-followups");
    await getVorcaroEntityStateChangedHandler().onEntityStateChanged({
      userId: session.user.id,
      entityType: "ALERT",
      entityId: id,
      newStatus: "RESOLVED",
    });
  }

  return NextResponse.json(serializeFinancialAlert(updated));
}
