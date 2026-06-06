import type { RealBankHomologReport } from "./real-bank-homologation.types";

function pct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function formatRealBankHomologMarkdown(report: RealBankHomologReport): string {
  const lines: string[] = [
    "# Homologação — Extratos Bancários Reais",
    "",
    `Gerado em: ${report.generatedAt}`,
    `Pasta: \`${report.banksRoot}\``,
    "",
    "## Resumo",
    "",
    "| Métrica | Valor |",
    "|---------|-------|",
    `| Slots totais | ${report.summary.totalSlots} |`,
    `| Arquivos disponíveis | ${report.summary.available} |`,
    `| Não disponíveis | ${report.summary.notAvailable} |`,
    `| PASSED | ${report.summary.passed} |`,
    `| WARNING | ${report.summary.warning} |`,
    `| FAILED | ${report.summary.failed} |`,
    `| Pronto para merge | ${report.summary.readyForMerge ? "Sim" : "Não"} |`,
    "",
    "## Bancos mínimos (obrigatórios)",
    "",
  ];

  for (const bank of report.minimumBanks) {
    const icon =
      bank.status === "PASSED" ? "✅" : bank.status === "WARNING" ? "⚠️" : bank.status === "PENDING" ? "⏳" : "❌";
    lines.push(`- ${icon} **${bank.bankFolder.replace(/_/g, " ")}** — ${bank.status}: ${bank.detail}`);
  }

  lines.push("", "## Detalhes por arquivo", "");

  for (const result of report.results) {
    if (result.availability === "not_available") {
      lines.push(`### ${result.bankLabel} — ${result.formatLabel}`);
      lines.push("");
      lines.push("**Disponibilidade:** não disponível");
      lines.push("");
      continue;
    }

    lines.push(`### ${result.bankLabel} — ${result.formatLabel}`);
    lines.push("");
    lines.push(`**Arquivo:** \`${result.fileName}\``);
    lines.push(`**Resultado:** ${result.status}`);
    lines.push("");

    if (result.metrics) {
      lines.push("| Métrica | Valor |");
      lines.push("|---------|-------|");
      lines.push(`| Transações encontradas | ${result.metrics.total} |`);
      lines.push(`| Reconhecidas automaticamente | ${result.metrics.recognized} |`);
      lines.push(`| Precisam revisar | ${result.metrics.needsReview} |`);
      lines.push(`| Ignoradas | ${result.metrics.ignored} |`);
      lines.push(`| Taxa de reconhecimento | ${pct(result.metrics.recognitionRate)} |`);
      lines.push(`| Similaridade | ${pct(result.similarity)} |`);
      lines.push(`| Modelo | ${result.modelLabel ?? "—"} |`);
      lines.push(`| Ação do modelo | ${result.modelAction} |`);
      lines.push("");
    }

    if (result.parserError) {
      lines.push(`**Erro:** ${result.parserError}`);
      lines.push("");
    }

    if (result.problems.length > 0) {
      lines.push("**Problemas encontrados:**");
      for (const p of result.problems) lines.push(`- ${p}`);
      lines.push("");
    }

    if (result.correctionsApplied.length > 0) {
      lines.push("**Correções aplicadas:**");
      for (const c of result.correctionsApplied) lines.push(`- ${c}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
