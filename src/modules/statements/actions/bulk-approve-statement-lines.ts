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
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return { count: 0, error: "Acesso negado: Tenant ID ausente na sessão" };
    }

    if (!input.suggestionIds || input.suggestionIds.length === 0) {
      return { count: 0, error: "Nenhum item selecionado" };
    }

    console.log(`[bulkApproveStatementLines] Iniciando processamento em lote: ID ${input.suggestionIds.join(", ")}`);

    // Executa transação atômica: lê, valida status PENDING, cria transações e deleta sugestões
    const totalApproved = await prisma.$transaction(async (tx) => {
      // Valida se o categoryId pertence ao tenant, caso tenha sido informado
      if (input.categoryId) {
        const category = await tx.category.findFirst({
          where: {
            id: input.categoryId,
            userId,
            user: { tenantId }
          }
        });
        if (!category) {
          throw new Error("Acesso negado: Categoria não pertence ao tenant ou não existe.");
        }
      }

      // Valida se o paymentMethodId pertence ao tenant, caso tenha sido informado
      let finalPaymentMethodId = input.paymentMethodId;
      if (finalPaymentMethodId) {
        const paymentMethod = await tx.paymentMethod.findFirst({
          where: {
            id: finalPaymentMethodId,
            userId,
            user: { tenantId }
          }
        });
        if (!paymentMethod) {
          throw new Error("Acesso negado: Método de pagamento não pertence ao tenant ou não existe.");
        }
      } else {
        console.log(`[bulkApproveStatementLines] Buscando método de pagamento padrão dentro da transação para o usuário: ID ${userId}`);
        const defaultPm = await tx.paymentMethod.findFirst({
          where: {
            userId,
            isActive: true,
            user: { tenantId }
          },
          orderBy: { isDefault: "desc" }
        });
        finalPaymentMethodId = defaultPm?.id;
      }

      // 1. Carrega todas as sugestões do lote associadas a este usuário, que pertencem ao tenant e estão pendentes
      console.log(`[bulkApproveStatementLines] Carregando sugestões pendentes do lote: ID ${input.suggestionIds.join(", ")}`);
      const suggestions = await tx.statementLineSuggestion.findMany({
        where: {
          id: { in: input.suggestionIds },
          userId,
          processed: false,
          user: { tenantId },
        },
        include: {
          user: {
            select: { tenantId: true }
          }
        }
      });

      // Se todas as sugestões já foram processadas/reconciliadas, retornamos 0 para garantir idempotência estrita
      if (suggestions.length === 0) {
        console.log(`[bulkApproveStatementLines] Nenhuma sugestão pendente encontrada no lote. Retornando 0 (idempotência).`);
        return 0;
      }

      // Validar se o tenantId obtido da sessão realmente confere com o tenantId dos registros afetados na query
      for (const s of suggestions) {
        if (!s.user || s.user.tenantId !== tenantId) {
          throw new Error("Acesso negado: Uma ou mais sugestões não pertencem ao tenant da sessão.");
        }
      }

      // Monta os dados para inserção das transações reais
      const transactionsToInsert = suggestions.map((s) => {
        const finalCategoryId = input.categoryId || s.suggestedCategoryId || undefined;
        const finalDate = input.dateOverride ? new Date(input.dateOverride) : s.date;

        return {
          userId,
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

      // 2. Insere as transações reais em uma única operação de escrita (em lote)
      console.log(`[bulkApproveStatementLines] Inserindo transações reais no banco de dados para o lote`);
      await tx.transaction.createMany({
        data: transactionsToInsert,
      });

      // 3. Deleta as sugestões do staging com isolamento de tenant, userId e status de pendência em uma única operação de escrita
      console.log(`[bulkApproveStatementLines] Excluindo sugestões do staging no lote`);
      const deleteResult = await tx.statementLineSuggestion.deleteMany({
        where: {
          id: { in: suggestions.map((s) => s.id) },
          userId,
          processed: false,
          user: { tenantId }
        },
      });

      if (deleteResult.count !== suggestions.length) {
        throw new Error("Falha ao remover as sugestões originais do staging.");
      }

      for (const s of suggestions) {
        console.log(`[bulkApproveStatementLines] Sugestão aprovada com sucesso: ID ${s.id}`);
      }

      return suggestions.length;
    });

    console.log(`[bulkApproveStatementLines] Lançamentos em lote efetivados com sucesso: ID ${input.suggestionIds.join(", ")}`);

    // Invalidação tática
    revalidateTag(`dashboard-metrics-${userId}`);
    revalidatePath("/dashboard/statements");
    revalidatePath("/dashboard/cash");

    return { count: totalApproved };
  } catch (error) {
    console.error(`[bulkApproveStatementLines] Falha no processamento em lote: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    return { count: 0, error: error instanceof Error ? error.message : "Erro interno ao processar a aprovação em lote" };
  }
}
