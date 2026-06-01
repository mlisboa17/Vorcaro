import type { PrismaClient } from "@prisma/client";
import {
  enqueueFinancialInboxProcessing,
  getFinancialInboxQueue,
} from "@/lib/queue";

const STALE_PROCESSING_MS = 2 * 60 * 1000;

async function removeStaleJob(inboxItemId: string): Promise<void> {
  const queue = getFinancialInboxQueue();
  const jobId = `inbox-${inboxItemId}`;
  const existing = await queue.getJob(jobId);

  if (!existing) {
    return;
  }

  const state = await existing.getState();
  if (state === "active" || state === "waiting" || state === "delayed") {
    await existing.discard();
  }

  await existing.remove();
}

export async function recoverOrphanedInboxItems(prisma: PrismaClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);

  const orphans = await prisma.financialInbox.findMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: cutoff },
    },
    select: { id: true, userId: true },
  });

  if (orphans.length === 0) {
    return 0;
  }

  await prisma.financialInbox.updateMany({
    where: { id: { in: orphans.map((item) => item.id) } },
    data: { status: "PENDING", errorMessage: null },
  });

  for (const item of orphans) {
    await removeStaleJob(item.id);
    await enqueueFinancialInboxProcessing({
      inboxItemId: item.id,
      userId: item.userId,
    });
  }

  console.info(`[financial-inbox] Recovered ${orphans.length} orphaned PROCESSING item(s)`);
  return orphans.length;
}
