"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function rejectStatementLine(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado" };
    }
    const userId = session.user.id;

    console.log("[rejectStatementLine] Rejeitando ID:", id, "userId:", userId);

    // Deleta dentro de transação atômica garantindo o userId (isolamento de tenant)
    const result = await prisma.$transaction(async (tx) => {
      const suggestion = await tx.statementLineSuggestion.findFirst({
        where: { id, userId },
      });

      if (!suggestion) {
        return { count: 0 };
      }

      const deleted = await tx.statementLineSuggestion.deleteMany({
        where: { id, userId },
      });

      return { count: deleted.count };
    });

    if (result.count === 0) {
      console.warn("[rejectStatementLine] Sugestão não encontrada ou já processada:", id);
      return { success: false, error: "Sugestão não encontrada ou já processada/descartada." };
    }

    revalidatePath("/dashboard/statements");
    return { success: true };
  } catch (error) {
    console.error("[rejectStatementLine] Falha ao rejeitar lançamento:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao descartar transação",
    };
  }
}
