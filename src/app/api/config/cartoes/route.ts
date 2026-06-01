import { NextResponse } from "next/server";
import { z } from "zod";
import { CardBrand, CardType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateCardUseCase,
  ListCardsUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import {
  PrismaCardRepository,
  PrismaFinancialAccountRepository,
} from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

const createSchema = z
  .object({
    nome: z.string().min(1).max(120),
    contaFinanceiraId: z.string().optional(),
    nomeInstituicao: z.string().max(120).optional(),
    bandeira: z.nativeEnum(CardBrand),
    tipo: z.nativeEnum(CardType),
    ultimosQuatroDigitos: z.string().regex(/^\d{4}$/).optional(),
    limiteCredito: z.number().positive().optional(),
    diaFechamento: z.number().int().min(1).max(31).optional(),
    diaVencimento: z.number().int().min(1).max(31).optional(),
  })
  .strict();

function serializeCard(record: {
  id: string;
  name: string;
  financialAccountId: string | null;
  institutionName: string | null;
  brand: CardBrand;
  type: CardType;
  lastFourDigits: string | null;
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
    estaAtivo: record.isActive,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const repository = new PrismaCardRepository(prisma);
  const useCase = new ListCardsUseCase(repository);
  const items = await useCase.execute(userId);

  return NextResponse.json({ items: items.map(serializeCard) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.contaFinanceiraId) {
    const accountRepository = new PrismaFinancialAccountRepository(prisma);
    const accountValid = await accountRepository.belongsToUser(
      parsed.data.contaFinanceiraId,
      userId,
    );

    if (!accountValid) {
      return NextResponse.json(
        { error: "Conta financeira vinculada não encontrada ou inválida" },
        { status: 400 },
      );
    }
  }

  const repository = new PrismaCardRepository(prisma);
  const useCase = new CreateCardUseCase(repository);

  const item = await useCase.execute({
    userId,
    name: parsed.data.nome,
    financialAccountId: parsed.data.contaFinanceiraId,
    institutionName: parsed.data.nomeInstituicao,
    brand: parsed.data.bandeira,
    type: parsed.data.tipo,
    lastFourDigits: parsed.data.ultimosQuatroDigitos,
    creditLimit: parsed.data.limiteCredito,
    closingDay: parsed.data.diaFechamento,
    dueDay: parsed.data.diaVencimento,
  });

  return NextResponse.json(serializeCard(item), { status: 201 });
}
