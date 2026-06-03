import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildReceivableUseCases, parseReceivableDate } from "@/lib/api/receivable-use-cases";
import { ReceivableError } from "@/modules/receivables/domain/errors/receivable.error";
import { serializeReceivable } from "@/types/receivables";

const bodySchema = z.object({
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const { createFromTransaction } = buildReceivableUseCases();
    const receivable = await createFromTransaction.execute({
      userId: session.user.id,
      transactionId: body.transactionId,
      devedorNome: body.devedorNome,
      expectedDate: body.expectedDate ? parseReceivableDate(body.expectedDate) : null,
      observacoes: body.observacoes ?? null,
    });

    return NextResponse.json(serializeReceivable(receivable), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return handleError(error);
  }
}
