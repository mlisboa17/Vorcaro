import "dotenv/config";
import { getFinancialInboxQueue, closeQueueConnections } from "../src/lib/queue";

async function main() {
  const queue = getFinancialInboxQueue();
  const counts = await queue.getJobCounts();
  console.log("Job counts:", counts);

  const waiting = await queue.getJobs(["waiting", "active", "delayed", "failed", "completed"], 0, 20);
  for (const job of waiting) {
    console.log(job.id, job.name, await job.getState(), job.data);
  }
}

main()
  .catch(console.error)
  .finally(() => closeQueueConnections());
