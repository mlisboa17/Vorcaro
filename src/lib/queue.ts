import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

export const QUEUE_NAMES = {
  FINANCIAL_INBOX: "financial-inbox",
  STATEMENT_IMPORT: "statement-import",
  PREDICTIVE_ALERTS: "predictive-alerts",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type FinancialInboxJobName = "process-inbox-item";

export interface FinancialInboxJobData {
  inboxItemId: string;
  userId: string;
}

export type StatementImportJobName = "process-statement-import";

export interface StatementImportJobData {
  fileId: string;
  fileName: string;
  userId: string;
  chatId: number;
  accountId: string;
}

export type PredictiveAlertsJobName = "process-predictive-alerts";

export interface PredictiveAlertsJobData {
  userId: string;
}

type GlobalQueueState = {
  redis: IORedis | undefined;
  queues: Map<string, Queue> | undefined;
};

const globalForQueue = globalThis as unknown as GlobalQueueState;

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not defined");
  }
  return url;
}

export function getRedisConnectionOptions(): ConnectionOptions {
  return {
    url: getRedisUrl(),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function getRedisConnection(): IORedis {
  if (!globalForQueue.redis) {
    globalForQueue.redis = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return globalForQueue.redis;
}

function getOrCreateQueue(name: QueueName): Queue {
  if (!globalForQueue.queues) {
    globalForQueue.queues = new Map();
  }

  const existing = globalForQueue.queues.get(name);
  if (existing) {
    return existing;
  }

  const queue = new Queue(name, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  globalForQueue.queues.set(name, queue);
  return queue;
}

export function getFinancialInboxQueue(): Queue<FinancialInboxJobData> {
  return getOrCreateQueue(QUEUE_NAMES.FINANCIAL_INBOX) as Queue<FinancialInboxJobData>;
}

export async function enqueueFinancialInboxProcessing(
  data: FinancialInboxJobData,
  options?: JobsOptions,
) {
  const queue = getFinancialInboxQueue();

  return queue.add("process-inbox-item" satisfies FinancialInboxJobName, data, {
    jobId: `inbox-${data.inboxItemId}`,
    ...options,
  });
}

export function getStatementImportQueue(): Queue<StatementImportJobData> {
  return getOrCreateQueue(QUEUE_NAMES.STATEMENT_IMPORT) as Queue<StatementImportJobData>;
}

export async function enqueueStatementImport(
  data: StatementImportJobData,
  options?: JobsOptions,
) {
  const queue = getStatementImportQueue();

  return queue.add("process-statement-import" satisfies StatementImportJobName, data, {
    jobId: `stmt-import-${data.fileId}-${Date.now()}`,
    ...options,
  });
}

export function getPredictiveAlertsQueue(): Queue<PredictiveAlertsJobData> {
  return getOrCreateQueue(QUEUE_NAMES.PREDICTIVE_ALERTS) as Queue<PredictiveAlertsJobData>;
}

export async function enqueuePredictiveAnalysis(
  data: PredictiveAlertsJobData,
  options?: JobsOptions,
) {
  const queue = getPredictiveAlertsQueue();

  return queue.add("process-predictive-alerts" satisfies PredictiveAlertsJobName, data, {
    jobId: `predictive-${data.userId}-${new Date().toISOString().split('T')[0]}`,
    ...options,
  });
}

export async function closeQueueConnections(): Promise<void> {
  if (globalForQueue.queues) {
    await Promise.all([...globalForQueue.queues.values()].map((queue) => queue.close()));
    globalForQueue.queues.clear();
  }

  if (globalForQueue.redis) {
    await globalForQueue.redis.quit();
    globalForQueue.redis = undefined;
  }
}
