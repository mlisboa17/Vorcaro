import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialPlanningService } from "@/lib/api/financial-planning";
import { updateFinancialGoalSchema } from "@/types/financial-planning";

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

  const parsed = updateFinancialGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const goal = await buildFinancialPlanningService().updateGoal(
      session.user.id,
      id,
      parsed.data,
    );
    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof Error && error.message === "GOAL_NOT_FOUND") {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await buildFinancialPlanningService().deleteGoal(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "GOAL_NOT_FOUND") {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
    }
    throw error;
  }
}
