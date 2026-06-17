"use server";

import { getTenantPrisma } from "@/lib/prisma-tenant";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function bulkUpdateCategory(transactionIds: string[], categoryId: string | null) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const prisma = getTenantPrisma(userId);

  if (!transactionIds.length) return { success: true, count: 0 };

  const result = await prisma.transaction.updateMany({
    where: {
      userId,
      id: { in: transactionIds },
    },
    data: {
      categoryId,
    },
  });

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/statements");

  return { success: true, count: result.count };
}
