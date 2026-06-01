import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethodType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreatePaymentMethodUseCase,
  ListPaymentMethodsUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import { PrismaPaymentMethodRepository } from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.nativeEnum(PaymentMethodType),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = new PrismaPaymentMethodRepository(prisma);
  const useCase = new ListPaymentMethodsUseCase(repository);
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

  const repository = new PrismaPaymentMethodRepository(prisma);
  const useCase = new CreatePaymentMethodUseCase(repository);
  const item = await useCase.execute({ userId: session.user.id, ...parsed.data });

  return NextResponse.json(item, { status: 201 });
}
