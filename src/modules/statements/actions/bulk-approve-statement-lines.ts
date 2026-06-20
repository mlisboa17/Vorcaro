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
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return { count: 0, error: "Acesso negado: Tenant ID ausente na sessão" };
    }
    const userId = session.user.id;

    if (!input.suggestionIds || input.suggestionIds.length === 0) {
      return { count: 0, error: "Nenhum item selecionado" };
    }

    console.log("[bulkApproveStatementLines] Efetivando IDs:", input.suggestionIds);

    // Carrega sugestões verificando propriedade E status não processado
    const suggestions = await prisma.statementLineSuggestion.findMany({
      where: {
        id: { in: input.suggestionIds },
        userId,
        processed: false,
      },
    });

    if (suggestions.length === 0) {
      console.warn("[bulkApproveStatementLines] Nenhum item válido/pendente encontrado para IDs:", input.suggestionIds);
      return { count: 0, error: "Nenhum item válido encontrado. Talvez já tenham sido processados." };
    }

    console.log("[bulkApproveStatementLines] Itens válidos a processar:", suggestions.length);

    // Busca método de pagamento padrão se não fornecido
    let finalPaymentMethodId = input.paymentMethodId;
    if (!finalPaymentMethodId) {
      const defaultPm = await prisma.paymentMethod.findFirst({
        where: { userId, isActive: true },
        orderBy: { isDefault: "desc" }
      });
      finalPaymentMethodId = defaultPm?.id;
    }

    // Monta os dados para inserção
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

    const validIds = suggestions.map((s) => s.id);

    // Executa transação atômica: cria transações + deleta sugestões
    await prisma.$transaction(async (tx) => {
      // 1. Insere as transações reais
      await tx.transaction.createMany({
        data: transactionsToInsert,
      });

      // 2. Deleta as sugestões do staging com guard de userId (isolamento de tenant)
      await tx.statementLineSuggestion.deleteMany({
        where: {
          id: { in: validIds },
          userId,
        },
      });
    });

    console.log("[bulkApproveStatementLines] Concluído. Total efetivado:", suggestions.length);

    // Invalidação tática
    revalidateTag(`dashboard-metrics-${userId}`);
    revalidatePath("/dashboard/statements");
    revalidatePath("/dashboard/cash");

    return { count: suggestions.length };
  } catch (error) {
    console.error("[bulkApproveStatementLines] Erro:", error);
    return { count: 0, error: "Erro interno ao processar a aprovação em lote" };
  }
}
