"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function ignoreDetectedAccount(suggestionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado" };
    }
    const userId = session.user.id;

    const result = await prisma.statementLineSuggestion.deleteMany({
      where: {
        id: suggestionId,
        userId,
        score: -99
      }
    });

    if (result.count === 0) {
      return { success: false, error: "Registro pendente não encontrado ou já removido." };
    }

    revalidatePath("/dashboard/statements");

    return { success: true };
  } catch (error) {
    console.error("[ignoreDetectedAccount] Erro ao ignorar conta detectada:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao ignorar conta."
    };
  }
}
