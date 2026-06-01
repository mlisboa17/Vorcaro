import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildRecurringUseCases } from "@/lib/api/recurring-use-cases";
import { createRecurringSchema } from "@/lib/recurring/recurring-schemas";
import { serializeRecurring } from "@/lib/recurring/serialize-recurring";
import { RecurringTransactionError } from "@/modules/recurring-transactions/domain/errors/recurring-transaction.error";
import { parseDateOnlyToUtcNoon } from "@/modules/recurring-transactions/domain/services/calculate-next-recurring-date";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";
  const { list } = buildRecurringUseCases();
  const items = await list.execute(session.user.id, { includeInactive });

  return NextResponse.json({ items: items.map(serializeRecurring) });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createRecurringSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { create } = buildRecurringUseCases();

  try {
    const item = await create.execute({
      userId: session.user.id,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
      valor: parsed.data.valor,
      frequencia: parsed.data.frequencia,
      dataInicio: parseDateOnlyToUtcNoon(parsed.data.dataInicio),
      dataFim: parsed.data.dataFim ? parseDateOnlyToUtcNoon(parsed.data.dataFim) : null,
      categoryId: parsed.data.categoriaId,
      financialAccountId: parsed.data.contaFinanceiraId,
      paymentMethodId: parsed.data.formaPagamentoId,
      cardId: parsed.data.cartaoId ?? null,
      observacoes: parsed.data.observacoes ?? null,
    });

    return NextResponse.json(serializeRecurring(item), { status: 201 });
  } catch (error) {
    if (error instanceof RecurringTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
