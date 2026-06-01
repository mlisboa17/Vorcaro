import { NextResponse } from "next/server";
import { z } from "zod";
import { CardBrand, CardType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateCardUseCase,
  ListCardsUseCase,
  UpdateCardUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import { PrismaCardRepository } from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  financialAccountId: z.string().optional(),
  institutionName: z.string().max(120).optional(),
  brand: z.nativeEnum(CardBrand),
  type: z.nativeEnum(CardType),
  lastFourDigits: z.string().regex(/^\d{4}$/).optional(),
  creditLimit: z.number().positive().optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
  financialAccountId: z.string().nullable().optional(),
  lastFourDigits: z.string().regex(/^\d{4}$/).nullable().optional(),
  institutionName: z.string().max(120).nullable().optional(),
  creditLimit: z.number().positive().nullable().optional(),
  closingDay: z.number().int().min(1).max(31).nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = new PrismaCardRepository(prisma);
  const useCase = new ListCardsUseCase(repository);
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

  const repository = new PrismaCardRepository(prisma);
  const useCase = new CreateCardUseCase(repository);
  const item = await useCase.execute({ userId: session.user.id, ...(parsed.data as z.infer<typeof createSchema>) });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payloadSchema = updateSchema.extend({ id: z.string().min(1) });
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const repository = new PrismaCardRepository(prisma);
  const useCase = new UpdateCardUseCase(repository);
  const item = await useCase.execute(id, session.user.id, data);

  if (!item) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
