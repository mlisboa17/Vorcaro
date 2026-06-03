import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancialAlertQueryService } from "@/modules/financial-alerts/application/services/financial-alert-query.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = new FinancialAlertQueryService(prisma);
  const summary = await service.summary(session.user.id);

  return NextResponse.json({
    totalOpen: summary.totalOpen,
    totalResolved: summary.totalResolved,
    totalCritical: summary.totalCritical,
    bySeverity: summary.bySeverity,
    byType: summary.byType,
  });
}
