import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteUserRuleUseCase } from "@/modules/financial-inbox/application/use-cases/manage-rules.use-case";
import { PrismaUserRuleRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-rule.repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const repository = new PrismaUserRuleRepository(prisma);
  const useCase = new DeleteUserRuleUseCase(repository);

  const deleted = await useCase.execute(id, session.user.id);

  if (!deleted) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json({ id, deleted: true });
}
