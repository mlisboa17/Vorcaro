"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export async function rejectSuggestion(patternId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Não autorizado" };

    const pattern = await prisma.userLearningPattern.findUnique({
      where: { id: patternId, userId: session.user.id }
    });

    if (!pattern) return { success: false, error: "Padrão não encontrado" };

    const newRejectionCount = pattern.rejectionCount + 1;
    const newStatus = newRejectionCount >= 3 ? "MUTED" : "PENDING";

    await prisma.userLearningPattern.update({
      where: { id: patternId },
      data: {
        rejectionCount: newRejectionCount,
        status: newStatus
      }
    });

    revalidateTag(`ai-insights-${session.user.id}`);
    revalidatePath("/dashboard/insights");

    return { success: true, muted: newStatus === "MUTED" };
  } catch (error) {
    console.error("[rejectSuggestion] Error:", error);
    return { success: false, error: "Falha ao rejeitar sugestão" };
  }
}

export async function applyBulkSuggestion(patternId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Não autorizado" };
    const userId = session.user.id;

    const pattern = await prisma.userLearningPattern.findUnique({
      where: { id: patternId, userId }
    });

    if (!pattern || pattern.status !== "PENDING") {
      return { success: false, error: "Padrão inválido ou já processado" };
    }

    const output = pattern.outputSignal as any;
    const { suggestedCategoryName, isNewCategory, transactionIds } = output;

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return { success: false, error: "Nenhuma transação vinculada ao padrão" };
    }

    await prisma.$transaction(async (tx) => {
      let targetCategoryId: string | null = null;

      if (isNewCategory && suggestedCategoryName) {
        // Creates the new category implicitly or gets an existing one
        let existingCat = await tx.category.findFirst({
          where: { userId, name: suggestedCategoryName }
        });
        
        if (!existingCat) {
          existingCat = await tx.category.create({
            data: {
              userId,
              name: suggestedCategoryName,
              type: "DESPESA", // Defaulting to DESPESA for uncategorized
              isActive: true,
              isSystem: false
            }
          });
        }
        targetCategoryId = existingCat.id;
      } else if (suggestedCategoryName) {
        // Attempt to find existing
        const existingCat = await tx.category.findFirst({
          where: { userId, name: suggestedCategoryName }
        });
        if (existingCat) targetCategoryId = existingCat.id;
      }

      // Update all transactions
      if (targetCategoryId) {
        await tx.transaction.updateMany({
          where: {
            id: { in: transactionIds },
            userId
          },
          data: {
            categoryId: targetCategoryId
          }
        });
      }

      // Mark pattern as APPROVED
      await tx.userLearningPattern.update({
        where: { id: patternId },
        data: { status: "APPROVED" }
      });
    });

    revalidateTag(`ai-insights-${userId}`);
    revalidateTag(`dashboard-metrics-${userId}`);
    revalidatePath("/dashboard/insights");

    return { success: true };
  } catch (error) {
    console.error("[applyBulkSuggestion] Error:", error);
    return { success: false, error: "Falha ao aplicar sugestão em lote" };
  }
}
