/**
 * Sprint 15.2.1 — homologação de parsers bancários PF/PJ
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBankStatementHomologation } from "../src/lib/bank-parsers/homologation/bank-statement-homologation.runner";

const FIXTURES_ROOT = join(process.cwd(), "tests", "fixtures", "bank-statements");
const report = runBankStatementHomologation(FIXTURES_ROOT);

const mdLines = [
  "# Relatório de homologação — Sprint 15.2.1",
  "",
  `Gerado em: ${report.generatedAt}`,
  "",
  `**Taxa global:** ${report.successRate}% (${report.successCount}/${report.totalFixtures})`,
  "",
  "## PDF Success Rate por banco",
  "",
  "| Banco | Perfil | Fixtures | Sucesso | Taxa |",
  "|-------|--------|----------|---------|------|",
  ...report.byBankProfile.map(
    (row) => `| ${row.bankId} | ${row.profile} | ${row.pdfs} | ${row.success} | ${row.rate}% |`,
  ),
  "",
  "## Detalhes",
  "",
  ...report.rows.map(
    (row) =>
      `- ${row.success ? "✅" : "❌"} \`${row.fileName}\` — ${row.detectedBank}/${row.detectedProfile} — ${row.transactionCount} tx — conf ${row.confidence}%${row.notes.length ? ` — ${row.notes.join("; ")}` : ""}`,
  ),
];

const outJson = join(process.cwd(), "scripts", "sprint-15.2.1-homologation-results.json");
const outMd = join(process.cwd(), "docs", "sprint-15.2.1-homologation-report.generated.md");

writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
writeFileSync(outMd, mdLines.join("\n"), "utf8");

console.log(JSON.stringify({ successRate: report.successRate, total: report.totalFixtures }, null, 2));
console.log(`Relatório: ${outMd}`);

if (report.successRate < 90 && report.totalFixtures > 0) {
  process.exitCode = 1;
}
