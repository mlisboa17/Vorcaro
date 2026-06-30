import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ txId: string }> };

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function resolveOwnedInstallment(userId: string, txId: string) {
  return prisma.transaction.findFirst({
    where: {
      id: txId,
      userId,
      OR: [
        { numeroParcela: { not: null } },
        { totalParcelas: { not: null } },
        { installmentGroup: { not: null } },
        { idGrupoParcelamento: { not: null } },
      ],
    },
    select: { id: true, status: true, numeroParcela: true },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { txId } = await context.params;
  const tx = await resolveOwnedInstallment(session.user.id, txId);
  if (!tx) {
    return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 422 });
  }

  const { description, amount, date } = parsed.data;

  const updated = await prisma.transaction.update({
    where: { id: txId },
    data: {
      ...(description !== undefined ? { description } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(date !== undefined
        ? { date: new Date(`${date}T12:00:00.000Z`), dataVencimentoFatura: new Date(`${date}T12:00:00.000Z`) }
        : {}),
    },
    select: { id: true, description: true, amount: true, date: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { txId } = await context.params;
  const tx = await resolveOwnedInstallment(session.user.id, txId);
  if (!tx) {
    return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
  }

  if (tx.status === "PAID") {
    return NextResponse.json({ error: "Parcela já paga não pode ser excluída" }, { status: 409 });
  }

  await prisma.transaction.delete({ where: { id: txId } });
  return NextResponse.json({ deleted: txId });
}
