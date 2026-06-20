"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export async function approveStatementLine(
  id: string,
  categoryId?: string | null,
  accountId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado" };
    }
    const userId = session.user.id;

    console.log("[approveStatementLine] Aprovando ID:", id, "userId:", userId);

    // Executa a deleção e criação dentro de uma transação isolada para garantir idempotência atômica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Busca e tenta deletar a linha do staging com processed: false
      const suggestion = await tx.statementLineSuggestion.findFirst({
        where: { id, userId, processed: false },
      });

      if (!suggestion) {
        return { success: false, alreadyProcessed: true };
      }

      // Deleta a linha do staging para que nenhuma outra thread possa pegá-la
      const deleteResult = await tx.statementLineSuggestion.deleteMany({
        where: { id, userId, processed: false },
      });

      if (deleteResult.count === 0) {
        return { success: false, alreadyProcessed: true };
      }

      // 2. Se houver conciliação, atualiza a transação existente. Caso contrário, cria uma nova.
      if (suggestion.reconciliationMatchId) {
        await tx.transaction.update({
          where: { id: suggestion.reconciliationMatchId, userId },
          data: {
            status: "PAID",
            dataCaixa: suggestion.date,
            ...(categoryId ? { categoryId } : {}),
            ...(accountId ? { accountId } : {}),
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            userId,
            description: suggestion.suggestedName ?? suggestion.description,
            amount: suggestion.amount,
            date: suggestion.date,
            originId: suggestion.originId,
            destinationId: suggestion.destinationId,
            identificationScore: suggestion.score,
            identificationStatus: suggestion.status,
            type: suggestion.originId ? "INCOME" : "EXPENSE",
            status: "PAID",
            dataCaixa: suggestion.date,
            categoryId: categoryId || undefined,
            accountId: accountId || undefined,
          },
        });
      }

      return { success: true };
    });

    if (!result.success && result.alreadyProcessed) {
      console.warn("[approveStatementLine] ID já processado:", id);
      return { success: false, error: "Esta sugestão já foi processada ou removida." };
    }

    revalidateTag(`dashboard-metrics-${userId}`);
    revalidatePath("/dashboard/statements");
    return { success: true };
  } catch (error) {
    console.error("[approveStatementLine] Falha ao aprovar lançamento:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao aprovar transação",
    };
  }
}
