import { NextResponse } from "next/server";
import { CardBrand, CardType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { buildInstrumentUseCases } from "@/lib/api/instrument-use-cases";
import { updateCardSchema } from "@/lib/settings/config-schemas";
import { InstrumentConfigError } from "@/modules/financial-instruments/domain/errors/instrument-config.error";

function serializeCard(record: {
  id: string;
  name: string;
  financialAccountId: string | null;
  institutionName: string | null;
  brand: CardBrand;
  type: CardType;
  lastFourDigits: string | null;
  closingDay: number | null;
  dueDay: number | null;
  isActive: boolean;
}) {
  return {
    id: record.id,
    nome: record.name,
    contaFinanceiraId: record.financialAccountId,
    nomeInstituicao: record.institutionName,
    bandeira: record.brand,
    tipo: record.type,
    ultimosQuatroDigitos: record.lastFourDigits,
    diaFechamento: record.closingDay,
    diaVencimento: record.dueDay,
    estaAtivo: record.isActive,
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
  const parsed = updateCardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { updateCard, accountRepository } = buildInstrumentUseCases();

  if (parsed.data.contaFinanceiraId) {
    const accountValid = await accountRepository.belongsToUser(
      parsed.data.contaFinanceiraId,
      session.user.id,
    );

    if (!accountValid) {
      return NextResponse.json(
        { error: "Conta financeira vinculada não encontrada ou inválida" },
        { status: 400 },
      );
    }
  }

  try {
    const item = await updateCard.execute(id, session.user.id, {
      name: parsed.data.nome,
      financialAccountId: parsed.data.contaFinanceiraId,
      institutionName: parsed.data.nomeInstituicao,
      brand: parsed.data.bandeira,
      type: parsed.data.tipo,
      lastFourDigits: parsed.data.ultimosQuatroDigitos,
      creditLimit: parsed.data.limiteCredito,
      closingDay: parsed.data.diaFechamento,
      dueDay: parsed.data.diaVencimento,
      isActive: parsed.data.estaAtivo,
    });

    return NextResponse.json(serializeCard(item));
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
  const { deleteCard } = buildInstrumentUseCases();

  try {
    const mode = await deleteCard.execute(id, session.user.id);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    if (error instanceof InstrumentConfigError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
