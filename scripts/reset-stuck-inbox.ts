import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  closeQueueConnections,
  enqueueFinancialInboxProcessing,
  getFinancialInboxQueue,
} from "../src/lib/queue";

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
  console.log(`Job removido (${state}): ${jobId}`);
}

async function main() {
  const stuck = await prisma.financialInbox.findMany({
    where: { status: "PROCESSING" },
    select: { id: true, userId: true, rawContent: true },
  });

  console.log(`Itens presos em PROCESSING: ${stuck.length}`);

  if (stuck.length > 0) {
    const result = await prisma.financialInbox.updateMany({
      where: { status: "PROCESSING" },
      data: { status: "PENDING", errorMessage: null },
    });
    console.log(`Resetados para PENDING: ${result.count}`);
  }

  const pending = await prisma.financialInbox.findMany({
    where: { status: { in: ["PENDING", "ERROR"] } },
    select: { id: true, userId: true },
  });

  for (const item of pending) {
    await removeStaleJob(item.id);
    await enqueueFinancialInboxProcessing({
      inboxItemId: item.id,
      userId: item.userId,
    });
    console.log(`Reenfileirado: ${item.id}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await closeQueueConnections();
    await prisma.$disconnect();
  });
