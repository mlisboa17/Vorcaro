import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { updateAssetSchema } from "@/lib/patrimony/patrimony-schemas";
import { serializePatrimonyAsset } from "@/lib/patrimony/serialize-patrimony";
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
  const parsed = updateAssetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { updateAsset } = buildPatrimonyUseCases();

  try {
    const item = await updateAsset.execute(id, session.user.id, {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
      valorAquisicao: parsed.data.valorAquisicao,
      valorAtual: parsed.data.valorAtual,
      dataAquisicao: parsed.data.dataAquisicao
        ? parsePatrimonyDate(parsed.data.dataAquisicao)
        : undefined,
      estaAtivo: parsed.data.estaAtiva,
      observacoes: parsed.data.observacoes,
      linkedLiabilityId: parsed.data.liabilityId,
    });

    return NextResponse.json(serializePatrimonyAsset(item));
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
  const { deleteAsset } = buildPatrimonyUseCases();

  try {
    const mode = await deleteAsset.execute(id, session.user.id);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
