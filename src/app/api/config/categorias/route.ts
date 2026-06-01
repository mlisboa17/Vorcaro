import { NextResponse } from "next/server";
import { z } from "zod";
import type { CategoryType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateCategoryConfigUseCase,
  ListCategoriesConfigUseCase,
} from "@/modules/financial-config/application/use-cases/category-config.use-cases";
import { CategoryConfigError } from "@/modules/financial-config/domain/errors/category-config.error";
import { PrismaCategoryConfigRepository } from "@/modules/financial-config/infrastructure/repositories/prisma-category-config.repository";

const createSchema = z
  .object({
    nome: z.string().min(1).max(120),
    tipo: z.enum(["RECEITA", "DESPESA"]),
    categoriaPaiId: z.string().min(1).optional(),
  })
  .strict();

function serializeCategory(record: {
  id: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
}) {
  return {
    id: record.id,
    nome: record.name,
    tipo: record.type,
    estaAtiva: record.isActive,
  };
}

function serializeCategoryTree(record: {
  id: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  subcategories: Array<{
    id: string;
    name: string;
    type: CategoryType;
    isActive: boolean;
  }>;
}) {
  return {
    id: record.id,
    nome: record.name,
    tipo: record.type,
    estaAtiva: record.isActive,
    subcategorias: record.subcategories.map(serializeCategory),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const repository = new PrismaCategoryConfigRepository(prisma);
  const useCase = new ListCategoriesConfigUseCase(repository);
  const items = await useCase.execute(userId);

  return NextResponse.json({ items: items.map(serializeCategoryTree) });
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

  const repository = new PrismaCategoryConfigRepository(prisma);
  const useCase = new CreateCategoryConfigUseCase(repository);

  try {
    const item = await useCase.execute({
      userId,
      name: parsed.data.nome,
      type: parsed.data.tipo,
      parentCategoryId: parsed.data.categoriaPaiId ?? null,
    });

    return NextResponse.json(serializeCategory(item), { status: 201 });
  } catch (error) {
    if (error instanceof CategoryConfigError) {
      const status = error.code === "OWNERSHIP" ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    throw error;
  }
}
