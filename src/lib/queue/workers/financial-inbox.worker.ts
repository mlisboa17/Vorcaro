import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { getRedisConnectionOptions, QUEUE_NAMES, type FinancialInboxJobData } from "@/lib/queue";
import { recoverOrphanedInboxItems } from "@/lib/queue/recover-orphaned-inbox";
import { processFinancialInboxItem } from "@/lib/queue/process-financial-inbox-item";
import { createStatementImportWorker } from "@/lib/queue/workers/statement-import.worker";
import { createPredictiveAlertsWorker } from "@/lib/queue/workers/predictive-alerts.worker";

export function createFinancialInboxWorker(): Worker<FinancialInboxJobData> {
  return new Worker<FinancialInboxJobData>(
    QUEUE_NAMES.FINANCIAL_INBOX,
    async (job) => {
      await processFinancialInboxItem(job.data.inboxItemId, job.data.userId);
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
    },
  );
}

function startWorker(): void {
  const worker = createFinancialInboxWorker();
  const statementWorker = createStatementImportWorker();
  const predictiveWorker = createPredictiveAlertsWorker();

  statementWorker.on("completed", (job) => console.info(`[statement-import] Job ${job.id} completed`));
  statementWorker.on("failed", (job, error) => console.error(`[statement-import] Job ${job?.id} failed:`, error.message));

  predictiveWorker.on("completed", (job) => console.info(`[predictive-alerts] Job ${job.id} completed`));
  predictiveWorker.on("failed", (job, error) => console.error(`[predictive-alerts] Job ${job?.id} failed:`, error.message));

  worker.on("completed", (job) => {
    console.info(`[financial-inbox] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[financial-inbox] Job ${job?.id} failed:`, error.message);
  });

  void recoverOrphanedInboxItems(prisma).catch((error) => {
    console.error("[financial-inbox] Orphan recovery failed:", error);
  });

  console.info("[financial-inbox] Worker listening on queue:", QUEUE_NAMES.FINANCIAL_INBOX);
}

const isDirectExecution =
  typeof require !== "undefined" && require.main === module;

if (isDirectExecution) {
  startWorker();
}
