import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildInstrumentUseCases } from "@/lib/api/instrument-use-cases";
import {
  mapConfigAccountTypeToPrisma,
  mapPrismaAccountTypeToConfig,
} from "@/modules/financial-config/domain/mappers/config-api.mapper";
import { updateAccountSchema } from "@/lib/settings/config-schemas";
import { InstrumentConfigError } from "@/modules/financial-instruments/domain/errors/instrument-config.error";

function serializeAccount(record: {
  id: string;
  name: string;
  institutionName: string | null;
  type: import("@prisma/client").AccountType;
  currency: string;
  balance: number;
  isActive: boolean;
}) {
  return {
    id: record.id,
    nome: record.name,
    nomeInstituicao: record.institutionName,
    tipo: mapPrismaAccountTypeToConfig(record.type),
    moeda: record.currency,
    saldo: record.balance,
    estaAtiva: record.isActive,
  };
}

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
  const parsed = updateAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { updateAccount } = buildInstrumentUseCases();

  try {
    const item = await updateAccount.execute(id, session.user.id, {
      name: parsed.data.nome,
      institutionName: parsed.data.nomeInstituicao,
      type: parsed.data.tipo ? mapConfigAccountTypeToPrisma(parsed.data.tipo) : undefined,
      currency: parsed.data.moeda,
      balance: parsed.data.saldo,
      isActive: parsed.data.estaAtiva,
    });

    return NextResponse.json(serializeAccount(item));
  } catch (error) {
    if (error instanceof InstrumentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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
  const { deleteAccount } = buildInstrumentUseCases();

  try {
    const mode = await deleteAccount.execute(id, session.user.id);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    if (error instanceof InstrumentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
