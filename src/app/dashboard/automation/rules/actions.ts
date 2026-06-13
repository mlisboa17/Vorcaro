"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const keyword = formData.get("keyword") as string;
  const targetCategoryId = formData.get("targetCategoryId") as string;
  const priority = parseInt(formData.get("priority") as string || "0", 10);

  if (!keyword || !targetCategoryId) throw new Error("Palavra-chave e Categoria são obrigatórios.");

  // Check if a rule with this keyword already exists for the user
  const existingRule = await prisma.transactionRule.findUnique({
    where: {
      userId_keyword: {
        userId: session.user.id,
        keyword: keyword.toLowerCase(),
      }
    }
  });

  if (existingRule) {
    throw new Error("Já existe uma regra com esta palavra-chave.");
  }

  await prisma.transactionRule.create({
    data: {
      userId: session.user.id,
      keyword: keyword.toLowerCase(),
      targetCategoryId,
      priority,
      isActive: true,
    }
  });

  revalidatePath("/dashboard/automation/rules");
}

export async function deleteRuleAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.transactionRule.delete({
    where: {
      id,
      userId: session.user.id,
    }
  });

  revalidatePath("/dashboard/automation/rules");
}

export async function toggleRuleStatusAction(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.transactionRule.update({
    where: {
      id,
      userId: session.user.id,
    },
    data: {
      isActive,
    }
  });

  revalidatePath("/dashboard/automation/rules");
}
