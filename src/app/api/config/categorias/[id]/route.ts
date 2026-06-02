import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCategoryConfigUseCases } from "@/lib/api/category-use-cases";
import { updateCategorySchema } from "@/lib/settings/config-schemas";
import { CategoryConfigError } from "@/modules/financial-config/domain/errors/category-config.error";
import type { CategoryType } from "@prisma/client";

function serializeCategory(record: {
  id: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  parentCategoryId: string | null;
}) {
  return {
    id: record.id,
    nome: record.name,
    tipo: record.type,
    estaAtiva: record.isActive,
    categoriaPaiId: record.parentCategoryId,
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
  const parsed = updateCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { update } = buildCategoryConfigUseCases();

  try {
    const item = await update.execute(id, session.user.id, {
      name: parsed.data.nome,
      isActive: parsed.data.estaAtiva,
    });

    return NextResponse.json(serializeCategory(item));
  } catch (error) {
    if (error instanceof CategoryConfigError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
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
  const { remove } = buildCategoryConfigUseCases();

  try {
    const mode = await remove.execute(id, session.user.id);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    if (error instanceof CategoryConfigError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
