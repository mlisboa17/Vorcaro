import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildReceivableUseCases, parseReceivableDate } from "@/lib/api/receivable-use-cases";
import { ReceivableError } from "@/modules/receivables/domain/errors/receivable.error";
import { serializeReceivable } from "@/types/receivables";

const collectSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional(),
});

const fromTransactionSchema = z.object({
  transactionId: z.string().min(1),
  devedorNome: z.string().min(1),
  expectedDate: z.string().optional(),
  observacoes: z.string().optional(),
});

function handleError(error: unknown) {
  if (error instanceof ReceivableError) {
    const status =
      error.code === "NOT_FOUND" ? 404 : error.code === "VALIDATION" ? 400 : 422;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const action = new URL(request.url).searchParams.get("action");

  try {
    if (action === "collect") {
      const body = collectSchema.parse(await request.json());
      const { collect } = buildReceivableUseCases();
      const result = await collect.execute({
        userId: session.user.id,
        receivableId: id,
        amount: body.amount,
        accountId: body.accountId,
        date: parseReceivableDate(body.date),
        description: body.description ?? null,
      });
      return NextResponse.json({
        receivable: serializeReceivable(result.receivable),
        transactionId: result.transactionId,
      });
    }

    if (action === "cancel") {
      const { cancel } = buildReceivableUseCases();
      const receivable = await cancel.execute(session.user.id, id);
      return NextResponse.json(serializeReceivable(receivable));
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return handleError(error);
  }
}
