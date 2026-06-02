import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { updateLiabilitySchema } from "@/lib/patrimony/patrimony-schemas";
import { serializePatrimonyLiability } from "@/lib/patrimony/serialize-patrimony";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";

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
  const parsed = updateLiabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { updateLiability } = buildPatrimonyUseCases();

  try {
    const item = await updateLiability.execute(id, session.user.id, {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
      saldoOriginal: parsed.data.saldoOriginal,
      saldoAtual: parsed.data.saldoAtual,
      taxaJuros: parsed.data.taxaJuros,
      dataContratacao: parsed.data.dataContratacao
        ? parsePatrimonyDate(parsed.data.dataContratacao)
        : undefined,
      dataQuitacaoPrevista: parsed.data.dataQuitacaoPrevista
        ? parsePatrimonyDate(parsed.data.dataQuitacaoPrevista)
        : undefined,
      estaAtivo: parsed.data.estaAtiva,
      observacoes: parsed.data.observacoes,
    });

    return NextResponse.json(serializePatrimonyLiability(item));
  } catch (error) {
    if (error instanceof PatrimonyError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
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
  const { deleteLiability } = buildPatrimonyUseCases();

  try {
    const mode = await deleteLiability.execute(id, session.user.id);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
