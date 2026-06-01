import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateFinancialAccountUseCase,
  ListFinancialAccountsUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import { PrismaFinancialAccountRepository } from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  institutionName: z.string().max(120).optional(),
  type: z.nativeEnum(AccountType),
  currency: z.string().length(3).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = new PrismaFinancialAccountRepository(prisma);
  const useCase = new ListFinancialAccountsUseCase(repository);
  const items = await useCase.execute(session.user.id);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repository = new PrismaFinancialAccountRepository(prisma);
  const useCase = new CreateFinancialAccountUseCase(repository);
  const item = await useCase.execute({ userId: session.user.id, ...parsed.data });

  return NextResponse.json(item, { status: 201 });
}
