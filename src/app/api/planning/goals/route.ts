import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialPlanningService } from "@/lib/api/financial-planning";
import {
  createFinancialGoalSchema,
  planningGoalsListSchema,
} from "@/types/financial-planning";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const payload = await buildFinancialPlanningService().getGoalsWithSummary(session.user.id);
  const parsed = planningGoalsListSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}

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

  const parsed = createFinancialGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await buildFinancialPlanningService().createGoal(session.user.id, parsed.data);
  return NextResponse.json(goal, { status: 201 });
}
