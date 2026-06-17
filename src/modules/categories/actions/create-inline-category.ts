"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export type InlineCategoryCreationInput = {
  name: string;
  type: "INCOME" | "EXPENSE" | "RECEITA" | "DESPESA";
  parentCategoryId?: string;
};

export async function createInlineCategory(
  input: InlineCategoryCreationInput
): Promise<{ categoryId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Não autorizado" };
    }
    const userId = session.user.id;

    if (!input.name || input.name.trim().length === 0) {
      return { error: "Nome da categoria é obrigatório" };
    }

    const typeMapped = (input.type === "INCOME" || input.type === "RECEITA") ? "RECEITA" : "DESPESA";

    // Verifica se já existe com esse nome no mesmo nível
    const existing = await prisma.category.findUnique({
      where: {
        userId_name_parentCategoryId: {
          userId,
          name: input.name.trim(),
          parentCategoryId: input.parentCategoryId || "",
        }
      }
    });

    if (existing) {
      return { categoryId: existing.id };
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: input.name.trim(),
        type: typeMapped,
        parentCategoryId: input.parentCategoryId,
        isActive: true,
        isSystem: false,
      }
    });

    revalidateTag(`categories-${userId}`);
    revalidatePath("/dashboard/statements");

    return { categoryId: category.id };
  } catch (error) {
    console.error("[createInlineCategory] Error:", error);
    return { error: "Erro interno ao criar categoria" };
  }
}
