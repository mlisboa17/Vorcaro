import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildExecutiveDashboardService } from "@/lib/api/executive-dashboard";
import { getInstallmentExecutiveSnapshotForUser } from "@/lib/api/installments";
import { buildFinancialPlanningService } from "@/lib/api/financial-planning";
import { executiveDashboardResponseSchema } from "@/types/executive-dashboard";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const [dashboard, planning, installments] = await Promise.all([
    buildExecutiveDashboardService().execute(userId),
    buildFinancialPlanningService().getExecutivePlanningSnapshot(userId),
    getInstallmentExecutiveSnapshotForUser(userId),
  ]);

  const payload = { ...dashboard, planning, installments };
  return NextResponse.json(executiveDashboardResponseSchema.parse(payload));
}
