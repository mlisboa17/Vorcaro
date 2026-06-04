import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { buildNotificationDigest } from "@/lib/api/notifications";

async function main() {
  const digest = buildNotificationDigest();
  const results = await digest.runWeeklyForAllUsers();
  console.info(`Digest semanal: ${results.filter((r) => r.weeklyCreated).length} criados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
