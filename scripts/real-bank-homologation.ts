/**
 * Homologação com extratos bancários reais (pastas locais em homologation/banks/).
 *
 * Uso: npm run homolog:real-banks
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupRealBankHomologUser,
  formatRealBankHomologMarkdown,
  runRealBankHomologation,
} from "../src/modules/statement-layout-training/homologation/real-bank/real-bank-homologation.runner";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Homologação — Extratos Bancários Reais ===\n");

  const userId = `real-bank-homolog-${Date.now()}`;
  let report;

  try {
    report = await runRealBankHomologation(prisma, { userId, cleanup: true });
  } finally {
    await cleanupRealBankHomologUser(prisma, userId).catch(() => undefined);
    await prisma.$disconnect();
  }

  const outJson = join(process.cwd(), "scripts", "real-bank-homologation-results.json");
  const outMd = join(process.cwd(), "docs", "real-bank-homologation-report.md");

  writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(outMd, formatRealBankHomologMarkdown(report), "utf8");

  console.log("--- Resumo ---");
  console.log(`Disponíveis: ${report.summary.available} | PASSED: ${report.summary.passed} | WARNING: ${report.summary.warning} | FAILED: ${report.summary.failed}`);
  console.log(`Pronto para merge: ${report.summary.readyForMerge ? "SIM" : "NÃO"}`);
  console.log("\nBancos mínimos:");
  for (const b of report.minimumBanks) {
    console.log(`  [${b.status}] ${b.bankFolder}: ${b.detail}`);
  }

  console.log(`\nRelatório JSON: ${outJson}`);
  console.log(`Relatório MD:   ${outMd}`);

  if (!report.summary.readyForMerge && report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
