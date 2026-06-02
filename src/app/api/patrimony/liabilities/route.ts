import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { createLiabilitySchema } from "@/lib/patrimony/patrimony-schemas";
import { serializePatrimonyLiability } from "@/lib/patrimony/serialize-patrimony";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const { listLiabilities } = buildPatrimonyUseCases();
  const items = await listLiabilities.execute(session.user.id, { includeInactive });

  return NextResponse.json({ items: items.map(serializePatrimonyLiability) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLiabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { createLiability } = buildPatrimonyUseCases();

  try {
    const item = await createLiability.execute({
      userId: session.user.id,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
      saldoOriginal: parsed.data.saldoOriginal,
      saldoAtual: parsed.data.saldoAtual,
      taxaJuros: parsed.data.taxaJuros,
      dataContratacao: parsed.data.dataContratacao
        ? parsePatrimonyDate(parsed.data.dataContratacao)
        : null,
      dataQuitacaoPrevista: parsed.data.dataQuitacaoPrevista
        ? parsePatrimonyDate(parsed.data.dataQuitacaoPrevista)
        : null,
      observacoes: parsed.data.observacoes,
    });

    return NextResponse.json(serializePatrimonyLiability(item), { status: 201 });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
