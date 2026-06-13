"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resolveBankStatement } from "@/lib/bank-parsers/bank-statement-parser-resolver";
import { ImportStatementUseCase } from "../application/use-cases/import-statement.use-case";

export async function importStatementAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const accountId = formData.get("accountId") as string;
    const file = formData.get("file") as File | null;

    if (!accountId) throw new Error("A conta financeira é obrigatória.");
    if (!file) throw new Error("O arquivo de extrato é obrigatório.");

    // Lê o conteúdo do arquivo
    const textContent = await file.text();

    // Invoca o Resolver (que vai testar os parsers disponíveis, incluindo OFX e CSV)
    const parseResult = resolveBankStatement(textContent);

    if (parseResult.usedGenericFallback) {
      console.warn("[ImportStatementAction] Usando generic fallback. O arquivo pode não ter sido lido corretamente.");
    }

    if (parseResult.statement.transactions.length === 0) {
      throw new Error("Nenhuma transação encontrada no arquivo.");
    }

    // Passa os dados para o Use Case que faz o Batch Insert e Categorização
    const useCase = new ImportStatementUseCase();
    const result = await useCase.execute({
      userId: session.user.id,
      accountId,
      fileName: file.name,
      parsedStatement: parseResult.statement,
    });

    // Revalida a página para atualizar o painel
    revalidatePath("/dashboard/transactions");

    return {
      success: true,
      importedCount: result.importedCount,
      ignoredCount: result.ignoredCount,
      message: `${result.importedCount} transações importadas com sucesso. ${result.ignoredCount > 0 ? `(${result.ignoredCount} ignoradas/duplicadas)` : ""}`
    };
  } catch (error: any) {
    console.error("[ImportStatementAction] Erro na importação:", error);
    return {
      success: false,
      error: error.message || "Erro desconhecido ao importar arquivo.",
    };
  }
}
