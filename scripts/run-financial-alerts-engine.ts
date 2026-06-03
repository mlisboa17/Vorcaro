/**
 * Motor de alertas financeiros — execução manual ou via cron (0 6 * * *).
 * Uso: npx tsx scripts/run-financial-alerts-engine.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { FinancialAlertEngineService } from "../src/modules/financial-alerts/application/services/financial-alert-engine.service";

async function main() {
  const engine = new FinancialAlertEngineService(prisma);
  const stats = await engine.runForAllUsers();
  console.info(JSON.stringify({ ok: true, ...stats }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
