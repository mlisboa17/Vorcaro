"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export type BulkStatementActionInput = {
  suggestionIds: string[];
  categoryId?: string;
  paymentMethodId?: string;
  dateOverride?: string;
};

export async function bulkApproveStatementLines(
  input: BulkStatementActionInput
): Promise<{ count: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { count: 0, error: "Não autorizado" };
    }
    const userId = session.user.id;

    if (!input.suggestionIds || input.suggestionIds.length === 0) {
      return { count: 0, error: "Nenhum item selecionado" };
    }

    // Load suggestions to verify ownership and get data
    const suggestions = await prisma.statementLineSuggestion.findMany({
      where: {
        id: { in: input.suggestionIds },
        userId: userId,
      },
    });

    if (suggestions.length === 0) {
      return { count: 0, error: "Nenhum item válido encontrado" };
    }

    // Default payment method if not provided (assume "OUTROS" or similar, or find default)
    let finalPaymentMethodId = input.paymentMethodId;
    if (!finalPaymentMethodId) {
      const defaultPm = await prisma.paymentMethod.findFirst({
        where: { userId, isActive: true },
        orderBy: { isDefault: "desc" }
      });
      finalPaymentMethodId = defaultPm?.id;
    }

    // Map to Transaction inserts
    const transactionsToInsert = suggestions.map((s) => {
      const finalCategoryId = input.categoryId || s.suggestedCategoryId || undefined;
      const finalDate = input.dateOverride ? new Date(input.dateOverride) : s.date;
      
      return {
        userId: s.userId,
        accountId: s.financialAccountId || undefined,
        categoryId: finalCategoryId,
        paymentMethodId: finalPaymentMethodId,
        type: s.type || "EXPENSE",
        amount: s.amount,
        description: s.description,
        date: finalDate,
        originId: s.originId || undefined,
        destinationId: s.destinationId || undefined,
        status: "COMPLETED",
        identificationScore: s.score,
        identificationStatus: s.status,
      };
    });

    // Execute atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Insert real transactions
      await tx.transaction.createMany({
        data: transactionsToInsert,
      });

      // 2. Delete the staged suggestions
      await tx.statementLineSuggestion.deleteMany({
        where: {
          id: { in: suggestions.map(s => s.id) },
        },
      });
    });

    // Invalidação Tática (Fiori Horizon Spec)
    revalidateTag(`dashboard-metrics-${userId}`);
    revalidatePath("/dashboard/statements");
    revalidatePath("/dashboard/cash");

    return { count: suggestions.length };
  } catch (error) {
    console.error("[bulkApproveStatementLines] Error:", error);
    return { count: 0, error: "Erro interno ao processar a aprovação em lote" };
  }
}
