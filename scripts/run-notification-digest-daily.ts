import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { buildNotificationDigest } from "@/lib/api/notifications";

async function main() {
  const digest = buildNotificationDigest();
  const results = await digest.runDailyForAllUsers();
  console.info(`Digest diário: ${results.filter((r) => r.dailyCreated).length} criados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
