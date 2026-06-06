import type {
  HomologCheck,
  StatementLayoutTrainingHomologReport,
} from "./statement-layout-training-homologation.types";

function statusIcon(status: string): string {
  switch (status) {
    case "PASS":
      return "✅";
    case "FAIL":
      return "❌";
    case "WARN":
      return "⚠️";
    default:
      return "○";
  }
}

export function formatStatementLayoutTrainingHomologMarkdown(
  report: StatementLayoutTrainingHomologReport,
): string {
  const lines: string[] = [
    "# Homologação — Treinamento de Extratos",
    "",
    `Gerado em: ${report.generatedAt}`,
    `Usuário de teste: \`${report.userId}\``,
    `Fixtures: \`${report.fixturesRoot}\``,
    "",
    "## Resumo",
    "",
    `| Métrica | Valor |`,
    `|---------|-------|`,
    `| Cenários | ${report.summary.total} |`,
    `| Aprovados | ${report.summary.passed} |`,
    `| Reprovados | ${report.summary.failed} |`,
    `| Pronto para produção | ${report.summary.ready ? "Sim" : "Não"} |`,
    "",
  ];

  for (const scenario of report.scenarios) {
    lines.push(`## ${scenario.id} — ${scenario.title}`);
    lines.push("");
    lines.push(`**Status:** ${statusIcon(scenario.status)} ${scenario.status}`);
    lines.push("");
    lines.push("| Campo | Valor |");
    lines.push("|-------|-------|");
    lines.push(`| Banco testado | ${scenario.bank} |`);
    lines.push(`| Arquivo | \`${scenario.file}\` |`);
    lines.push(`| Similaridade | ${scenario.similarity.toFixed(1)}% (${scenario.similarityTier}) |`);
    lines.push(`| Lançamentos encontrados | ${scenario.metrics.total} |`);
    lines.push(`| Reconhecidos | ${scenario.metrics.recognized} |`);
    lines.push(`| Precisam revisar | ${scenario.metrics.needsReview} |`);
    lines.push(`| Ignorados | ${scenario.metrics.ignored} |`);
    lines.push(`| Modelo | ${scenario.modelAction} |`);
    lines.push(`| Modelo ID | ${scenario.modelId ?? "—"} |`);
    lines.push(`| Versão | ${scenario.modelVersion ?? "—"} |`);
    lines.push(`| Layout | ${scenario.layoutLabel ?? "—"} |`);
    lines.push(`| Correções aplicadas | ${scenario.correctionsApplied} |`);
    lines.push("");

    if (scenario.problems.length > 0) {
      lines.push("**Problemas:**");
      for (const p of scenario.problems) lines.push(`- ${p}`);
      lines.push("");
    }

    lines.push("**Checks:**");
    for (const check of scenario.checks) {
      lines.push(`- ${statusIcon(check.status)} ${check.name}: ${check.detail}`);
    }
    lines.push("");
  }

  lines.push("## Validação da tela / API");
  for (const check of report.uiValidation) {
    lines.push(`- ${statusIcon(check.status)} ${check.name}: ${check.detail}`);
  }
  lines.push("");
  lines.push("## Validação do fluxo de importação");
  for (const check of report.importFlowValidation) {
    lines.push(`- ${statusIcon(check.status)} ${check.name}: ${check.detail}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function appendChecksSection(title: string, checks: HomologCheck[]): string {
  return [title, ...checks.map((c) => `${statusIcon(c.status)} ${c.name}: ${c.detail}`)].join("\n");
}
