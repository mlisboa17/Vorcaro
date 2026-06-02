import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreatePaymentMethodUseCase,
  ListPaymentMethodsUseCase,
} from "@/modules/financial-instruments/application/use-cases/financial-instrument.use-cases";
import {
  mapConfigPaymentMethodTypeToPrisma,
  mapPrismaPaymentMethodTypeToConfig,
} from "@/modules/financial-config/domain/mappers/config-api.mapper";
import { PrismaPaymentMethodRepository } from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";

const createSchema = z
  .object({
    nome: z.string().min(1).max(120),
    tipo: z.enum(["PIX", "DINHEIRO", "BOLETO", "TRANSFERENCIA", "CARTAO", "DEBITO_AUTOMATICO"]),
    padrao: z.boolean().optional(),
  })
  .strict();

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const repository = new PrismaPaymentMethodRepository(prisma);
  const useCase = new ListPaymentMethodsUseCase(repository);
  const items = await useCase.execute(userId, { includeInactive });

  return NextResponse.json({ items: items.map(serializePaymentMethod) });
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

  const repository = new PrismaPaymentMethodRepository(prisma);
  const useCase = new CreatePaymentMethodUseCase(repository);

  const item = await useCase.execute({
    userId,
    name: parsed.data.nome,
    type: mapConfigPaymentMethodTypeToPrisma(parsed.data.tipo),
    isDefault: parsed.data.padrao,
  });

  return NextResponse.json(serializePaymentMethod(item), { status: 201 });
}
