import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { consortiumParcelSchema } from "@/lib/patrimony/patrimony-schemas";
import {
  serializeAccountingImpact,
  serializePatrimonyAsset,
} from "@/lib/patrimony/serialize-patrimony";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = consortiumParcelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { registerConsortiumParcel } = buildPatrimonyUseCases();

  try {
    const result = await registerConsortiumParcel.execute({
      userId: session.user.id,
      assetId: parsed.data.assetId,
      data: parsePatrimonyDate(parsed.data.data),
      descricao: parsed.data.descricao,
      fundoComum: parsed.data.fundoComum,
      taxaAdministracao: parsed.data.taxaAdministracao,
      fundoReserva: parsed.data.fundoReserva,
      mainTransactionId: parsed.data.mainTransactionId,
    });

    return NextResponse.json({
      asset: serializePatrimonyAsset(result.asset),
      impact: serializeAccountingImpact(result.impact),
    });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
