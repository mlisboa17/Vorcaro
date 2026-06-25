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
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return { success: false, error: "Acesso negado: Tenant ID ausente na sessão" };
    }
    const userId = session.user.id;

    console.log(`[rejectStatementLine] Iniciando rejeição de linha: ID ${id}`);

    // Deleta dentro de transação atômica garantindo o userId e tenantId (isolamento de tenant)
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[rejectStatementLine] Buscando sugestão de linha no staging para rejeição: ID ${id}`);
      const suggestion = await tx.statementLineSuggestion.findFirst({
        where: { 
          id, 
          userId,
          processed: false,
          user: { tenantId }
        },
      });

      if (!suggestion) {
        console.log(`[rejectStatementLine] Sugestão de linha não encontrada ou já processada/descartada: ID ${id}`);
        return { count: 0 };
      }

      console.log(`[rejectStatementLine] Removendo sugestão de linha no staging para rejeição: ID ${id}`);
      const deleted = await tx.statementLineSuggestion.deleteMany({
        where: { 
          id, 
          userId,
          processed: false,
          user: { tenantId }
        },
      });

      return { count: deleted.count };
    });

    if (result.count === 0) {
      console.log(`[rejectStatementLine] Sugestão não encontrada ou já processada/descartada: ID ${id}`);
      return { success: false, error: "Sugestão não encontrada ou já processada/descartada." };
    }

    console.log(`[rejectStatementLine] Sugestão rejeitada com sucesso: ID ${id}`);

    revalidatePath("/dashboard/statements");
    return { success: true };
  } catch (error) {
    console.error(`[rejectStatementLine] Falha ao rejeitar lançamento: ID ${id}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao descartar transação",
    };
  }
}
