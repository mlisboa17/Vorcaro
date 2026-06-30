import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildInstallmentReadModelService } from "@/lib/api/installments";
import { installmentGroupListSchema } from "@/types/installments";
import { prisma } from "@/lib/prisma";
import { CreateInstallmentSeriesUseCase } from "@/modules/transactions/use-cases/create-installment-series.use-case";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const groups = await buildInstallmentReadModelService().listGroups(session.user.id);
  const parsed = installmentGroupListSchema.safeParse(groups);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }

  return NextResponse.json(parsed.data);
}

const createInstallmentSeriesSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  totalAmount: z.number().positive("Valor deve ser positivo"),
  totalInstallments: z.number().int().min(2).max(60),
  baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  cardId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createInstallmentSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { description, totalAmount, totalInstallments, baseDate, cardId, accountId, categoryId, paymentMethodId } =
    parsed.data;

  const useCase = new CreateInstallmentSeriesUseCase(prisma);
  const first = await useCase.execute({
    userId: session.user.id,
    description,
    totalAmount,
    totalInstallments,
    baseDate: new Date(`${baseDate}T12:00:00`),
    type: "EXPENSE",
    providerEventId: `manual_${randomUUID()}`,
    cardId: cardId ?? undefined,
    accountId: accountId ?? undefined,
    categoryId: categoryId ?? undefined,
    paymentMethodId: paymentMethodId ?? undefined,
  });

  return NextResponse.json({ id: first.id }, { status: 201 });
}
