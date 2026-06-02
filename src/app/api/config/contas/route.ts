import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateFinancialAccountUseCase,
  ListFinancialAccountsUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import {
  mapConfigAccountTypeToPrisma,
  mapPrismaAccountTypeToConfig,
} from "@/modules/financial-config/domain/mappers/config-api.mapper";
import { PrismaFinancialAccountRepository } from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

const createSchema = z
  .object({
    nome: z.string().min(1).max(120),
    nomeInstituicao: z.string().max(120).optional(),
    tipo: z.enum([
      "CORRENTE",
      "POUPANCA",
      "INVESTIMENTO",
      "CARTEIRA_DIGITAL",
      "CARTEIRA_DINHEIRO",
      "PJ",
    ]),
    moeda: z.string().length(3).optional(),
    saldoInicial: z.number().optional(),
  })
  .strict();

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const repository = new PrismaFinancialAccountRepository(prisma);
  const useCase = new ListFinancialAccountsUseCase(repository);
  const items = await useCase.execute(userId, { includeInactive });

  return NextResponse.json({ items: items.map(serializeAccount) });
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

  const repository = new PrismaFinancialAccountRepository(prisma);
  const useCase = new CreateFinancialAccountUseCase(repository);

  const item = await useCase.execute({
    userId,
    name: parsed.data.nome,
    institutionName: parsed.data.nomeInstituicao,
    type: mapConfigAccountTypeToPrisma(parsed.data.tipo),
    currency: parsed.data.moeda,
    saldoInicial: parsed.data.saldoInicial,
  });

  return NextResponse.json(serializeAccount(item), { status: 201 });
}
