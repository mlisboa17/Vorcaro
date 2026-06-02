import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildInstrumentUseCases } from "@/lib/api/instrument-use-cases";
import {
  mapConfigPaymentMethodTypeToPrisma,
  mapPrismaPaymentMethodTypeToConfig,
} from "@/modules/financial-config/domain/mappers/config-api.mapper";
import { updatePaymentMethodSchema } from "@/lib/settings/config-schemas";
import { InstrumentConfigError } from "@/modules/financial-instruments/domain/errors/instrument-config.error";

function serializePaymentMethod(record: {
  id: string;
  name: string;
  type: import("@prisma/client").PaymentMethodType;
  isDefault: boolean;
  isActive: boolean;
}) {
  return {
    id: record.id,
    nome: record.name,
    tipo: mapPrismaPaymentMethodTypeToConfig(record.type),
    padrao: record.isDefault,
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
  const parsed = updatePaymentMethodSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { updatePaymentMethod } = buildInstrumentUseCases();

  try {
    const item = await updatePaymentMethod.execute(id, session.user.id, {
      name: parsed.data.nome,
      type: parsed.data.tipo ? mapConfigPaymentMethodTypeToPrisma(parsed.data.tipo) : undefined,
      isDefault: parsed.data.padrao,
      isActive: parsed.data.estaAtiva,
    });

    return NextResponse.json(serializePaymentMethod(item));
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
  const { deletePaymentMethod } = buildInstrumentUseCases();

  try {
    const mode = await deletePaymentMethod.execute(id, session.user.id);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    if (error instanceof InstrumentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
