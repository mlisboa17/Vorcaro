import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { consortiumContemplationSchema } from "@/lib/patrimony/patrimony-schemas";
import { serializePatrimonyAsset, serializePatrimonyLiability } from "@/lib/patrimony/serialize-patrimony";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = consortiumContemplationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { registerConsortiumContemplation } = buildPatrimonyUseCases();

  try {
    const result = await registerConsortiumContemplation.execute({
      userId: session.user.id,
      consortiumAssetId: parsed.data.consortiumAssetId,
      targetAsset: {
        nome: parsed.data.targetAsset.nome,
        tipo: parsed.data.targetAsset.tipo,
        descricao: parsed.data.targetAsset.descricao,
        dataAquisicao: parsePatrimonyDate(parsed.data.targetAsset.dataAquisicao),
      },
      saldoDevedorRemanescente: parsed.data.saldoDevedorRemanescente,
      liabilityNome: parsed.data.liabilityNome,
      data: parsePatrimonyDate(parsed.data.data),
      descricao: parsed.data.descricao,
    });

    return NextResponse.json({
      closedAsset: serializePatrimonyAsset(result.closedAsset),
      newAsset: serializePatrimonyAsset(result.newAsset),
      liability: result.liability ? serializePatrimonyLiability(result.liability) : null,
    });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
