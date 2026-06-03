import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialInsightsService } from "@/lib/api/financial-advisor";
import { advisorInsightsResponseSchema } from "@/types/financial-advisor";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = buildFinancialInsightsService();
  const payload = await service.generate(session.user.id);

  return NextResponse.json(advisorInsightsResponseSchema.parse(payload));
}
