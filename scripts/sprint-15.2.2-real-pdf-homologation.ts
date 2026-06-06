/**
 * Sprint 15.2.2 — homologação com PDFs reais e relatório automático
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runRealPdfHomologation } from "../src/lib/bank-parsers/homologation/real-pdf-homologation.runner";
import { runOcrBenchmark } from "../src/lib/bank-parsers/homologation/ocr-benchmark.runner";
import { formatRealPdfHomologationMarkdown } from "../src/lib/bank-parsers/homologation/real-pdf-homologation-report.formatter";

const FIXTURES_ROOT = join(process.cwd(), "tests", "fixtures", "bank-statements", "real");

async function main() {
  const report = await runRealPdfHomologation(FIXTURES_ROOT);
  const ocrReport = await runOcrBenchmark(FIXTURES_ROOT);

  const outJson = join(process.cwd(), "scripts", "sprint-15.2.2-homologation-results.json");
  const outMd = join(process.cwd(), "docs", "sprint-15.2.2-real-pdf-homologation-report.md");

  writeFileSync(outJson, JSON.stringify({ report, ocrReport }, null, 2), "utf8");
  writeFileSync(outMd, formatRealPdfHomologationMarkdown(report, ocrReport), "utf8");

  console.log(
    JSON.stringify(
      {
        successRate: report.successRate,
        total: report.totalFixtures,
        realPdfs: report.realPdfCount,
        ready: report.gateCriteria.readyForSprint153,
      },
      null,
      2,
    ),
  );
  console.log(`Relatório: ${outMd}`);

  if (report.totalFixtures > 0 && report.successRate < 90) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
