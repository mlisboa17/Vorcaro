import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import {
  getRedisConnectionOptions,
  QUEUE_NAMES,
  type FinancialInboxJobData,
} from "@/lib/queue";
import { ProcessInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/process-inbox-item.use-case";
import { EnrichExtractionUseCase } from "@/modules/financial-inbox/application/use-cases/enrich-extraction.use-case";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";
import { PrismaUserRuleRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-rule.repository";
import { GeminiAiService } from "@/modules/financial-inbox/infrastructure/services/gemini-ai.service";
import { recoverOrphanedInboxItems } from "@/lib/queue/recover-orphaned-inbox";
import { PrismaCategoryConfigRepository } from "@/modules/financial-config/infrastructure/repositories/prisma-category-config.repository";
import {
  PrismaCardRepository,
  PrismaFinancialAccountRepository,
  PrismaInstrumentLookupService,
  PrismaPaymentMethodRepository,
} from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";
import { InboxClassificationService } from "@/modules/inbox-intelligence/application/services/inbox-classification.service";
import { mergeClassificationIntoExtraction } from "@/lib/inbox/apply-inbox-classification";
import { createStatementImportWorker } from "@/lib/queue/workers/statement-import.worker";

function createProcessInboxItemUseCase(): ProcessInboxItemUseCase {
  const inboxRepository = new PrismaInboxRepository(prisma);
  const extractionResultRepository = new PrismaExtractionResultRepository(prisma);
  const aiService = new GeminiAiService();
  const accountRepository = new PrismaFinancialAccountRepository(prisma);
  const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
  const cardRepository = new PrismaCardRepository(prisma);
  const instrumentLookup = new PrismaInstrumentLookupService(
    accountRepository,
    paymentMethodRepository,
    cardRepository,
  );

  const enrichExtractionUseCase = new EnrichExtractionUseCase(
    new PrismaUserRuleRepository(prisma),
    new PrismaUserLearningPatternRepository(prisma),
    instrumentLookup,
    new PrismaCategoryConfigRepository(prisma),
  );

  return new ProcessInboxItemUseCase(
    inboxRepository,
    aiService,
    extractionResultRepository,
    enrichExtractionUseCase,
  );
}

export function createFinancialInboxWorker(): Worker<FinancialInboxJobData> {
  const inboxRepository = new PrismaInboxRepository(prisma);

  return new Worker<FinancialInboxJobData>(
    QUEUE_NAMES.FINANCIAL_INBOX,
    async (job) => {
      const { inboxItemId, userId } = job.data;

      const item = await inboxRepository.findById(inboxItemId);
      if (!item) {
        throw new Error(`Inbox item not found: ${inboxItemId}`);
      }

      if (item.userId !== userId) {
        throw new Error(`Unauthorized job for inbox item: ${inboxItemId}`);
      }

      await inboxRepository.updateStatus(inboxItemId, "PROCESSING");

      try {
        const useCase = createProcessInboxItemUseCase();
        const result = await useCase.execute({ inboxItemId, userId });

        const classifier = new InboxClassificationService(prisma);
        const suggestion = await classifier.classify({
          userId,
          description: result.extraction.description ?? item.rawContent,
          rawContent: item.rawContent,
          descricaoBase: result.extraction.descricaoBase,
          category: result.extraction.category,
          paymentMethod: result.extraction.paymentMethod,
        });
        const merged = mergeClassificationIntoExtraction(result.extraction, suggestion);
        const extractionRepo = new PrismaExtractionResultRepository(prisma);
        await extractionRepo.updateExtractedData(result.extractionResultId, merged);

        console.info(
          `[financial-inbox] Item ${inboxItemId} → ${result.status} (extraction: ${result.extractionResultId})`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown processing error";

        await inboxRepository.updateStatus(inboxItemId, "ERROR", message).catch(() => {
          console.error(`[financial-inbox] Failed to persist ERROR status for ${inboxItemId}`);
        });

        console.error(`[financial-inbox] Item ${inboxItemId} → ERROR: ${message}`);
      }
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

  statementWorker.on("completed", (job) => console.info(`[statement-import] Job ${job.id} completed`));
  statementWorker.on("failed", (job, error) => console.error(`[statement-import] Job ${job?.id} failed:`, error.message));

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
