/**
 * Homologação real — Treinamento de Extratos
 *
 * Valida aprendizado incremental com fixtures CSV (Novo Banco Digital simulado).
 *
 * Uso:
 *   npx tsx scripts/statement-layout-training-homologation.ts
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupStatementLayoutHomologUser,
  runStatementLayoutTrainingHomologation,
} from "../src/modules/statement-layout-training/homologation/statement-layout-training-homologation.runner";
import { formatStatementLayoutTrainingHomologMarkdown } from "../src/modules/statement-layout-training/homologation/statement-layout-training-homologation-report.formatter";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Homologação — Treinamento de Extratos ===\n");

  const userId = `layout-homolog-${Date.now()}`;
  let report;

  try {
    report = await runStatementLayoutTrainingHomologation(prisma, { userId, cleanup: true });
  } finally {
    await cleanupStatementLayoutHomologUser(prisma, userId).catch(() => undefined);
    await prisma.$disconnect();
  }

  const outJson = join(process.cwd(), "scripts", "statement-layout-training-homologation-results.json");
  const outMd = join(process.cwd(), "docs", "statement-layout-training-homologation-report.md");

  writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(outMd, formatStatementLayoutTrainingHomologMarkdown(report), "utf8");

  console.log("\n--- Resumo ---");
  for (const scenario of report.scenarios) {
    const icon = scenario.status === "PASS" ? "✓" : "✗";
    console.log(
      `${icon} [${scenario.id}] ${scenario.title} | ${scenario.bank} | sim=${scenario.similarity.toFixed(1)}% | found=${scenario.metrics.total} recognized=${scenario.metrics.recognized} review=${scenario.metrics.needsReview} | model=${scenario.modelAction}`,
    );
    if (scenario.problems.length > 0) {
      for (const p of scenario.problems) console.log(`    ! ${p}`);
    }
  }

  console.log(`\nUI/API: ${report.uiValidation.filter((c) => c.status === "PASS").length}/${report.uiValidation.length} checks`);
  console.log(`Import: ${report.importFlowValidation.filter((c) => c.status === "PASS").length}/${report.importFlowValidation.length} checks`);
  console.log(`\nRelatório JSON: ${outJson}`);
  console.log(`Relatório MD:   ${outMd}`);
  console.log(`\nPronto: ${report.summary.ready ? "SIM" : "NÃO"} (${report.summary.passed}/${report.summary.total} cenários)`);

  if (!report.summary.ready) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
