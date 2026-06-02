import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { createAssetSchema } from "@/lib/patrimony/patrimony-schemas";
import { serializePatrimonyAsset } from "@/lib/patrimony/serialize-patrimony";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const { listAssets, liabilityRepository } = buildPatrimonyUseCases();
  const [assets, liabilities] = await Promise.all([
    listAssets.execute(session.user.id, { includeInactive }),
    liabilityRepository.listByUserId(session.user.id, { includeInactive }),
  ]);

  const liabilityMap = new Map(liabilities.map((l) => [l.id, l]));

  return NextResponse.json({
    items: assets.map((asset) =>
      serializePatrimonyAsset(
        asset,
        asset.linkedLiabilityId ? liabilityMap.get(asset.linkedLiabilityId) : null,
      ),
    ),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAssetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { createAsset } = buildPatrimonyUseCases();

  try {
    const item = await createAsset.execute({
      userId: session.user.id,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
      valorAquisicao: parsed.data.valorAquisicao,
      valorAtual: parsed.data.valorAtual,
      dataAquisicao: parsed.data.dataAquisicao ? parsePatrimonyDate(parsed.data.dataAquisicao) : null,
      observacoes: parsed.data.observacoes,
      linkedLiabilityId: parsed.data.liabilityId,
    });

    return NextResponse.json(serializePatrimonyAsset(item), { status: 201 });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
