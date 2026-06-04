import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildIntelligentAdvisorService } from "@/lib/api/financial-advisor";
import { advisorConsultationResponseSchema } from "@/types/advisor-consultant";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = buildIntelligentAdvisorService();
  const payload = await service.consult(session.user.id);

  return NextResponse.json(advisorConsultationResponseSchema.parse(payload));
}
