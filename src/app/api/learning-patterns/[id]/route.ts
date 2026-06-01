import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ForgetLearningPatternUseCase } from "@/modules/financial-inbox/application/use-cases/manage-rules.use-case";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const repository = new PrismaUserLearningPatternRepository(prisma);
  const useCase = new ForgetLearningPatternUseCase(repository);

  const result = await useCase.execute(id, session.user.id);

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Learning pattern not found" }, { status: 404 });
  }

  return NextResponse.json({
    id,
    keyword: result.keyword,
    deletedCount: result.deletedCount,
  });
}
