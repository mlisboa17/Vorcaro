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

    // Deleta a sugestão do staging garantindo o tenantId
    const result = await prisma.statementLineSuggestion.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (result.count === 0) {
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
