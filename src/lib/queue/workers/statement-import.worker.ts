import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import {
  getRedisConnectionOptions,
  QUEUE_NAMES,
  type StatementImportJobData,
} from "@/lib/queue";
import { downloadTelegramFile, sendTelegramMessage } from "@/lib/telegram/telegram-bot.client";
import { resolveBankStatement } from "@/lib/bank-parsers/bank-statement-parser-resolver";
import { ImportStatementUseCase } from "@/modules/transactions/application/use-cases/import-statement.use-case";

export function createStatementImportWorker(): Worker<StatementImportJobData> {
  return new Worker<StatementImportJobData>(
    QUEUE_NAMES.STATEMENT_IMPORT,
    async (job) => {
      const { fileId, fileName, userId, chatId, accountId } = job.data;

      try {
        // Busca a conta selecionada
        const account = await prisma.financialAccount.findUnique({
          where: { id: accountId },
        });

        if (!account) {
          await sendTelegramMessage(chatId, "⚠️ Ops! Não encontrei a conta bancária selecionada.");
          throw new Error(`Account not found: ${accountId}`);
        }

        const { buffer } = await downloadTelegramFile(fileId, "application/octet-stream");
        const text = buffer.toString("utf-8");

        const result = resolveBankStatement(text);
        if (result.statement.transactions.length === 0) {
          await sendTelegramMessage(chatId, "⚠️ Não encontrei nenhuma transação válida neste arquivo. Verifique se o formato está correto.");
          return;
        }

        const useCase = new ImportStatementUseCase();

        const importResult = await useCase.execute({
          userId,
          accountId: account.id,
          fileName,
          parsedStatement: result.statement,
        });

        const successMsg = `✅ *Importação Concluída!*\n\nConta destino: *${account.name}*\nTransações processadas: *${importResult.importedCount}*\nDuplicadas ignoradas: *${importResult.ignoredCount}*`;
        await sendTelegramMessage(chatId, successMsg);

        console.info(`[statement-import] Sucesso: ${fileName} para user ${userId} (Imported: ${importResult.importedCount})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao processar extrato";
        console.error(`[statement-import] Falha ao processar arquivo ${fileId}:`, message);
        await sendTelegramMessage(chatId, `❌ Ocorreu um erro ao processar seu extrato: ${message}`);
        throw error;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 2,
    },
  );
}

function startWorker(): void {
  const worker = createStatementImportWorker();

  worker.on("completed", (job) => {
    console.info(`[statement-import] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[statement-import] Job ${job?.id} failed:`, error.message);
  });

  console.info("[statement-import] Worker listening on queue:", QUEUE_NAMES.STATEMENT_IMPORT);
}

const isDirectExecution = typeof require !== "undefined" && require.main === module;

if (isDirectExecution) {
  startWorker();
}
