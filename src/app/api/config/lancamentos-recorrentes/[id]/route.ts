import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildRecurringUseCases } from "@/lib/api/recurring-use-cases";
import { updateRecurringSchema } from "@/lib/recurring/recurring-schemas";
import { serializeRecurring } from "@/lib/recurring/serialize-recurring";
import { RecurringTransactionError } from "@/modules/recurring-transactions/domain/errors/recurring-transaction.error";
import { parseDateOnlyToUtcNoon } from "@/modules/recurring-transactions/domain/services/calculate-next-recurring-date";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateRecurringSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { update } = buildRecurringUseCases();

  try {
    const item = await update.execute({
      userId: session.user.id,
      id,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
      valor: parsed.data.valor,
      frequencia: parsed.data.frequencia,
      dataInicio: parsed.data.dataInicio
        ? parseDateOnlyToUtcNoon(parsed.data.dataInicio)
        : undefined,
      dataFim:
        parsed.data.dataFim === undefined
          ? undefined
          : parsed.data.dataFim
            ? parseDateOnlyToUtcNoon(parsed.data.dataFim)
            : null,
      proximaExecucao: parsed.data.proximaExecucao
        ? parseDateOnlyToUtcNoon(parsed.data.proximaExecucao)
        : undefined,
      categoryId: parsed.data.categoriaId,
      financialAccountId: parsed.data.contaFinanceiraId,
      paymentMethodId: parsed.data.formaPagamentoId,
      cardId: parsed.data.cartaoId,
      observacoes: parsed.data.observacoes,
    });

    return NextResponse.json(serializeRecurring(item));
  } catch (error) {
    if (error instanceof RecurringTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const { deactivate } = buildRecurringUseCases();

  try {
    await deactivate.execute(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RecurringTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
