import { getTenantPrisma } from "@/lib/prisma-tenant";
import { randomUUID } from "crypto";
import type { ExtractedBankStatement } from "@/lib/bank-parsers/bank-statement-parser.types";
import { CategoryRuleEngine } from "@/modules/automation/services/CategoryRuleEngine";

export type ImportStatementInput = {
  userId: string;
  accountId: string;
  fileName: string;
  parsedStatement: ExtractedBankStatement;
};

export type ImportStatementOutput = {
  success: boolean;
  importedCount: number;
  ignoredCount: number;
  importId: string;
};

export class ImportStatementUseCase {
  async execute(input: ImportStatementInput): Promise<ImportStatementOutput> {
    const prisma = getTenantPrisma(input.userId);

    // 1. Gera um hash único para este import (pode ajudar a evitar re-uploads idênticos no futuro se mapeado)
    const importHash = randomUUID();

    // 2. Registra o início/conclusão da importação no histórico
    const importRecord = await prisma.bankStatementImport.create({
      data: {
        userId: input.userId,
        accountId: input.accountId,
        fileName: input.fileName,
        importHash,
        status: "COMPLETED",
        transactionsCount: input.parsedStatement.transactions.length,
      },
    });

    const allExtracted = input.parsedStatement.transactions;
    if (allExtracted.length === 0) {
      return {
        success: true,
        importedCount: 0,
        ignoredCount: 0,
        importId: importRecord.id,
      };
    }

    // 3. IDEMPOTÊNCIA EM LOTE (Performance)
    // Extrai os fitIds presentes no extrato. Fallback para um UUID temporário se não houver (para garantir inserção, mas ideal é o parser gerar fallback md5)
    const extractedFitIds = allExtracted
      .map((tx) => tx.fingerprint)
      .filter((id): id is string => Boolean(id));

    // Busca no banco QUAIS fitIds já existem para esta conta
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        accountId: input.accountId,
        userId: input.userId,
        fitId: {
          in: extractedFitIds,
        },
      },
      select: {
        fitId: true,
      },
    });

    const existingFitIdsSet = new Set(existingTransactions.map((tx) => tx.fitId));

    // Filtra as transações separando o que é novo e o que já existia
    const newTransactionsToInsert = allExtracted.filter(
      (tx) => tx.fingerprint && !existingFitIdsSet.has(tx.fingerprint)
    );

    const ignoredCount = allExtracted.length - newTransactionsToInsert.length;

    if (newTransactionsToInsert.length === 0) {
      return {
        success: true,
        importedCount: 0,
        ignoredCount,
        importId: importRecord.id,
      };
    }

    // 4. CATEGORIZAÇÃO EM LOTE
    const ruleEngine = new CategoryRuleEngine();
    const batchInput = newTransactionsToInsert.map((tx) => ({
      id: tx.fingerprint!, // Usamos o fingerprint temporariamente como ID de correlação
      description: tx.description,
    }));

    const categoryMap = await ruleEngine.executeBatch(batchInput, input.userId);

    // 5. INSERÇÃO EM LOTE (createMany)
    const dataToInsert = newTransactionsToInsert.map((tx) => {
      const match = categoryMap[tx.fingerprint!] || { categoryId: null, ruleId: null };
      
      return {
        userId: input.userId, // Required by tenant extension
        accountId: input.accountId,
        description: tx.description,
        amount: tx.amount,
        type: tx.direction,
        date: new Date(tx.date),
        fitId: tx.fingerprint,
        categoryId: match.categoryId || undefined, // Usa a categoria retornada pela engine
        ruleId: match.ruleId || undefined, // Rastro de auditoria da automação
      };
    });

    const result = await prisma.transaction.createMany({
      data: dataToInsert,
      skipDuplicates: true, // Proteção extra caso exista concorrência ou fitId não foi bem filtrado
    });

    return {
      success: true,
      importedCount: result.count,
      ignoredCount: ignoredCount + (newTransactionsToInsert.length - result.count), // Ajusta ignorados se createMany skippou algo
      importId: importRecord.id,
    };
  }
}
