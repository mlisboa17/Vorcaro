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
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return { success: false, error: "Acesso negado: Tenant ID ausente na sessão" };
    }
    const userId = session.user.id;

    console.log(`[approveStatementLine] Iniciando aprovação de linha: ID ${id}`);

    // Executa a deleção e criação dentro de uma transação isolada para garantir idempotência atômica
    const result = await prisma.$transaction(async (tx) => {
      // Valida se o categoryId pertence ao tenant, caso tenha sido informado
      if (categoryId) {
        const category = await tx.category.findFirst({
          where: {
            id: categoryId,
            userId,
            user: { tenantId }
          }
        });
        if (!category) {
          throw new Error("Acesso negado: Categoria não pertence ao tenant ou não existe.");
        }
      }

      // Valida se o accountId pertence ao tenant, caso tenha sido informado
      if (accountId) {
        const account = await tx.financialAccount.findFirst({
          where: {
            id: accountId,
            userId,
            user: { tenantId }
          }
        });
        if (!account) {
          throw new Error("Acesso negado: Conta financeira não pertence ao tenant ou não existe.");
        }
      }

      // 1. Busca e tenta deletar a linha do staging com processed: false
      console.log(`[approveStatementLine] Buscando sugestão de linha no staging: ID ${id}`);
      const suggestion = await tx.statementLineSuggestion.findFirst({
        where: { 
          id, 
          userId, 
          processed: false,
          user: { tenantId }
        },
      });

      if (!suggestion) {
        console.log(`[approveStatementLine] Sugestão de linha não encontrada ou já processada: ID ${id}`);
        return { success: false, alreadyProcessed: true };
      }

      // Deleta a linha do staging para que nenhuma outra thread possa pegá-la
      console.log(`[approveStatementLine] Removendo sugestão de linha do staging: ID ${id}`);
      const deleteResult = await tx.statementLineSuggestion.deleteMany({
        where: { 
          id, 
          userId, 
          processed: false,
          user: { tenantId }
        },
      });

      if (deleteResult.count === 0) {
        console.log(`[approveStatementLine] Falha ao deletar sugestão (concorrência): ID ${id}`);
        return { success: false, alreadyProcessed: true };
      }

      // 2. Se houver conciliação, atualiza a transação existente. Caso contrário, cria uma nova.
      if (suggestion.reconciliationMatchId) {
        console.log(`[approveStatementLine] Buscando transação correspondente para conciliação: ID ${suggestion.reconciliationMatchId}`);
        const targetTx = await tx.transaction.findFirst({
          where: {
            id: suggestion.reconciliationMatchId,
            userId,
            user: { tenantId }
          }
        });

        if (!targetTx) {
          throw new Error(`Transação correspondente para conciliação não encontrada ou acesso negado: ID ${suggestion.reconciliationMatchId}`);
        }

        console.log(`[approveStatementLine] Atualizando transação correspondente: ID ${targetTx.id}`);
        await tx.transaction.updateMany({
          where: {
            id: targetTx.id,
            userId,
            user: { tenantId }
          },
          data: {
            status: "PAID",
            dataCaixa: suggestion.date,
            ...(categoryId ? { categoryId } : {}),
            ...(accountId ? { accountId } : {}),
          },
        });
      } else {
        console.log(`[approveStatementLine] Criando nova transação conciliada para sugestão: ID ${id}`);
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
      console.log(`[approveStatementLine] ID já processado ou inexistente para este tenant: ID ${id}`);
      return { success: false, error: "Esta sugestão já foi processada ou removida." };
    }

    console.log(`[approveStatementLine] Sugestão aprovada com sucesso: ID ${id}`);

    revalidateTag(`dashboard-metrics-${userId}`);
    revalidatePath("/dashboard/statements");
    return { success: true };
  } catch (error) {
    console.error(`[approveStatementLine] Falha ao aprovar lançamento: ID ${id}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao aprovar transação",
    };
  }
}
