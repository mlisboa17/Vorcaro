import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { runRealPdfHomologation } from "../src/lib/bank-parsers/homologation/real-pdf-homologation.runner";
import { runOcrBenchmark } from "../src/lib/bank-parsers/homologation/ocr-benchmark.runner";
import { formatRealPdfHomologationMarkdown } from "../src/lib/bank-parsers/homologation/real-pdf-homologation-report.formatter";
import {
  formatInventoryMarkdown,
  mergeInventoryIntoDoc,
  scanBankPdfInventory,
} from "../src/lib/bank-parsers/homologation/bank-pdf-inventory.runner";
import { generateLargeBankStatement } from "../src/lib/bank-parsers/homologation/large-statement.generator";
import { resolveBankStatement } from "../src/lib/bank-parsers";
import { readFileSync } from "node:fs";
import { extractInstallmentPurchasesFromText } from "../src/modules/financial-documents/domain/services/card-invoice-installment-parser.service";
import { analyzeFinancialDocumentText } from "../src/modules/financial-documents/domain/services/financial-document-import-analyzer.service";

const FIXTURES_ROOT = join(process.cwd(), "tests", "fixtures", "bank-statements", "real");
const INVENTORY_DOC = join(process.cwd(), "docs", "bank-layout-inventory.md");
const OUT_JSON = join(process.cwd(), "scripts", "sprint-15.2.2-homologation-results.json");
const OUT_MD = join(process.cwd(), "docs", "sprint-15.2.2-real-pdf-homologation-report.md");

type LargeStatementBenchmark = {
  lines: number;
  parseMs: number;
  transactionCount: number;
  heapDeltaMb: number;
};

type InstallmentValidation = {
  pattern: string;
  current: number | null;
  total: number | null;
  ok: boolean;
};

function measureLargeStatement(lines: number): LargeStatementBenchmark {
  const text = generateLargeBankStatement(lines);
  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  const result = resolveBankStatement(text);
  const parseMs = Math.round(performance.now() - started);
  const heapDeltaMb = Math.round((process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024);
  return {
    lines,
    parseMs,
    transactionCount: result.statement.transactions.length,
    heapDeltaMb,
  };
}

function validateInstallments(): InstallmentValidation[] {
  const cases = [
    { pattern: "2/12", line: "03/06 LOJA ABC C02/12 SAO PAULO 120,00" },
    { pattern: "3/10", line: "04/06 MERCADO C03/10 CURITIBA 89,90" },
    { pattern: "4/24", line: "05/06 POSTO XYZ 04/24 250,00" },
    { pattern: "5/24", line: "06/06 LOJA DEF 05/24 BELO HORIZONTE 199,00" },
  ];

  return cases.map(({ pattern, line }) => {
    const purchases = extractInstallmentPurchasesFromText(line);
    const [currentStr, totalStr] = pattern.split("/");
    const current = purchases[0]?.currentInstallment ?? null;
    const total = purchases[0]?.totalInstallments ?? null;
    return {
      pattern,
      current,
      total,
      ok: current === Number(currentStr) && total === Number(totalStr),
    };
  });
}

function formatFinalReport(input: {
  generatedAt: string;
  inventory: Awaited<ReturnType<typeof scanBankPdfInventory>>;
  report: Awaited<ReturnType<typeof runRealPdfHomologation>>;
  ocrReport: Awaited<ReturnType<typeof runOcrBenchmark>>;
  largeBenchmarks: LargeStatementBenchmark[];
  installments: InstallmentValidation[];
  installmentReview: { batchReviewRequired: boolean; purchaseCount: number; autoCommit: false };
}): string {
  const base = formatRealPdfHomologationMarkdown(input.report, input.ocrReport);
  const pdfCount = input.inventory.filter((r) => r.fileType === "pdf").length;
  const sprintClosed =
    pdfCount >= 50 &&
    input.report.successRate >= 95 &&
    input.installments.every((i) => i.ok);

  const extra = [
    "",
    "---",
    "",
    "## Etapa 1 — Inventário de PDFs",
    "",
    formatInventoryMarkdown(input.inventory, input.generatedAt),
    "",
    "## Etapa 4 — Parcelamentos",
    "",
    "| Padrão | Parcela atual | Total | OK |",
    "|--------|---------------|-------|-----|",
    ...input.installments.map(
      (i) => `| ${i.pattern} | ${i.current ?? "—"} | ${i.total ?? "—"} | ${i.ok ? "✅" : "❌"} |`,
    ),
    "",
    `- **Revisão obrigatória:** ${input.installmentReview.batchReviewRequired ? "Sim" : "Não"}`,
    `- **Compras detectadas:** ${input.installmentReview.purchaseCount}`,
    `- **Compromissos automáticos:** Não (confirmação humana obrigatória)`,
    "",
    "## Etapa 8 — Extratos grandes (benchmark)",
    "",
    "| Linhas | Tempo parse (ms) | Transações | Δ heap (MB) |",
    "|--------|------------------|------------|-------------|",
    ...input.largeBenchmarks.map(
      (b) => `| ${b.lines} | ${b.parseMs} | ${b.transactionCount} | ${b.heapDeltaMb} |`,
    ),
    "",
    "## Etapas 5–7 — Validação automatizada (testes Vitest)",
    "",
    "Executar localmente:",
    "",
    "```bash",
    "npm test -- --run src/lib/parsers/__tests__/pdf-parser.test.ts",
    "npm test -- --run src/modules/financial-documents/__tests__/financial-document-reimport-hotfix.test.ts",
    "npm test -- --run src/modules/financial-documents/__tests__/financial-document-bank-statement-installments.test.ts",
    "npm test -- --run src/modules/financial-documents/__tests__/financial-document-review-hardening.test.ts",
    "```",
    "",
    "| Área | Suite | Escopo |",
    "|------|-------|--------|",
    "| PDF protegido | `pdf-parser.test.ts` | PASSWORD_REQUIRED, senha inválida |",
    "| Reprocessamento | `financial-document-reimport-hotfix.test.ts` | REJECTED, FAILED, sem duplicar |",
    "| Telegram | `financial-document-review-hardening.test.ts` | Resumo, link review, baixa confiança |",
    "| Parcelamentos | `financial-document-bank-statement-installments.test.ts` | Detecção + confirmação humana |",
    "",
    "## Veredicto Sprint 15.2.2",
    "",
    `| Critério | Status |`,
    `|----------|--------|`,
    `| 50+ PDFs reais | ${pdfCount >= 50 ? "✅" : "❌"} (${pdfCount}/50) |`,
    `| Sucesso médio ≥ 95% | ${input.report.successRate >= 95 ? "✅" : "❌"} (${input.report.successRate}%) |`,
    `| Parcelamentos 2/12–5/24 | ${input.installments.every((i) => i.ok) ? "✅" : "❌"} |`,
    `| Extratos grandes benchmark | ${input.largeBenchmarks.every((b) => b.parseMs < 3000) ? "✅" : "⚠️"} |`,
    `| Telegram homologado | ⏳ Validar manualmente / testes unitários |`,
    `| PDF protegido homologado | ⏳ Validar manualmente / testes unitários |`,
    `| 0 bugs críticos | ⏳ ${input.report.failures.length === 0 ? "Nenhuma falha parser na massa atual" : `${input.report.failures.length} falha(s) aberta(s)`} |`,
    "",
    `**Sprint encerrada:** ${sprintClosed ? "SIM" : "NÃO"}`,
    "",
    pdfCount === 0
      ? "> ⚠️ **Nenhum PDF real (.pdf) encontrado** em `tests/fixtures/bank-statements/real/`. Copie PDFs anonimizados para `{banco}/{pf|pj}/` com sidecar `.meta.json` e reexecute este script."
      : pdfCount < 50
        ? `> ⚠️ Faltam **${50 - pdfCount} PDFs** para atingir o critério de encerramento.`
        : "",
  ];

  return `${base}\n${extra.join("\n")}`;
}

async function main() {
  const generatedAt = new Date().toISOString();

  const inventory = await scanBankPdfInventory(FIXTURES_ROOT);
  const existingDoc = readFileSync(INVENTORY_DOC, "utf8");
  writeFileSync(
    INVENTORY_DOC,
    mergeInventoryIntoDoc(existingDoc, formatInventoryMarkdown(inventory, generatedAt)),
    "utf8",
  );

  const report = await runRealPdfHomologation(FIXTURES_ROOT);
  const ocrReport = await runOcrBenchmark(FIXTURES_ROOT);
  const largeBenchmarks = [100, 300, 1000].map(measureLargeStatement);
  const installments = validateInstallments();

  const cardInvoice = `
Bradesco Cartões
Fatura do cartão
06/06 LOJA DEF 05/24 BELO HORIZONTE 199,00
`;
  const installmentAnalysis = analyzeFinancialDocumentText(cardInvoice, { userId: "u1" });

  const payload = {
    generatedAt,
    inventory,
    report,
    ocrReport,
    largeBenchmarks,
    installments,
    installmentReview: {
      batchReviewRequired: installmentAnalysis.batchReviewRequired,
      purchaseCount: installmentAnalysis.installmentPurchases.length,
      autoCommit: false as const,
    },
  };

  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(OUT_MD, formatFinalReport(payload), "utf8");

  console.log(
    JSON.stringify(
      {
        pdfs: inventory.filter((r) => r.fileType === "pdf").length,
        successRate: report.successRate,
        failures: report.failures.length,
        sprintClosed: false,
        report: OUT_MD,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
