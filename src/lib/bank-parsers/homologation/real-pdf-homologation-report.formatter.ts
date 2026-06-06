import type { BankHomologationReport, OcrBenchmarkReport } from "./bank-statement-homologation.types";

function gateIcon(ok: boolean): string {
  return ok ? "✅" : "⏳";
}

export function formatRealPdfHomologationMarkdown(
  report: BankHomologationReport,
  ocrReport?: OcrBenchmarkReport,
): string {
  const lines: string[] = [
    "# Sprint 15.2.2 — Homologação com PDFs Reais",
    "",
    `Gerado em: ${report.generatedAt}`,
    "",
    "## Resumo",
    "",
    `- **Fixtures avaliados:** ${report.totalFixtures}`,
    `- **PDFs reais (.pdf):** ${report.realPdfCount} (meta encerramento: ${report.gateCriteria.minRealPdfs}+)`,
    `- **Taxa global:** ${report.successRate}% (${report.successCount}/${report.totalFixtures}) — meta ≥ ${report.gateCriteria.minSuccessRate}%`,
    `- **Pronto para Sprint 15.3/15.4:** ${report.gateCriteria.readyForSprint153 ? "Sim" : "Não"}`,
    "",
    "## PDF Success Rate por banco/perfil",
    "",
    "| Banco | Perfil | Fixtures | Sucesso | Taxa | Meta |",
    "|-------|--------|----------|---------|------|------|",
    ...report.byBankProfile.map((row) => {
      const met = row.rate >= 90 ? "✅" : "❌";
      return `| ${row.bankId} | ${row.profile} | ${row.pdfs} | ${row.success} | ${row.rate}% | ${met} ≥90% |`;
    }),
    "",
    "## Falhas identificadas",
    "",
  ];

  if (report.failures.length === 0) {
    lines.push("_Nenhuma falha registrada._");
  } else {
    for (const failure of report.failures) {
      lines.push(
        `- **${failure.bankId}/${failure.profile}** \`${failure.fileName}\`: ${failure.notes.join("; ") || "falha não especificada"}`,
      );
    }
  }

  lines.push("", "## Detalhes por fixture", "");
  for (const row of report.rows) {
    lines.push(
      `- ${row.success ? "✅" : "❌"} \`${row.fileName}\` — ${row.detectedBank}/${row.detectedProfile} — ${row.documentType} — fonte ${row.source} — ${row.transactionCount} tx — conf ${row.confidence}% — OCR: ${row.requiresOcr ? "sim" : "não"} — ${row.extractionMs}ms${row.notes.length ? ` — ${row.notes.join("; ")}` : ""}`,
    );
  }

  lines.push(
    "",
    "## Critério para encerrar 15.2.2",
    "",
    `${gateIcon(report.gateCriteria.realPdfCountMet)} 50+ PDFs reais homologados (${report.realPdfCount}/${report.gateCriteria.minRealPdfs})`,
    `${gateIcon(report.gateCriteria.successRateMet)} 95% de sucesso médio (${report.successRate}%)`,
    "⏳ 0 bugs críticos — validação manual",
    "⏳ Telegram validado (PIX, extrato, fatura, PDF protegido)",
    "⏳ PDF protegido validado (PASSWORD_REQUIRED, reprocessamento)",
    "",
    "Só avançar para **Sprint 15.3 OFX/CSV** e **Sprint 15.4 Conciliação Bancária** quando todos os critérios acima estiverem ✅.",
    "",
    "## Ações corretivas sugeridas",
    "",
  );

  const bankFailures = new Map<string, number>();
  for (const f of report.failures) {
    const key = `${f.bankId}:${f.profile}`;
    bankFailures.set(key, (bankFailures.get(key) ?? 0) + 1);
  }

  if (bankFailures.size === 0) {
    lines.push("- Manter massa real atualizada em `tests/fixtures/bank-statements/real/`.");
  } else {
    for (const [key, count] of bankFailures) {
      lines.push(`- Revisar parser/layout **${key}** (${count} falha(s)) — ajustar marcadores ou colunas.`);
    }
  }

  if (ocrReport) {
    lines.push("", "## OCR Benchmark", "", "| Cenário | Arquivo | Tempo (ms) | Texto | OCR? | Fallback | Conf |", "|---------|---------|------------|-------|------|----------|------|");
    for (const row of ocrReport.rows) {
      lines.push(
        `| ${row.scenario} | ${row.fileName} | ${row.extractionMs} | ${row.textLength} chars | ${row.requiresOcr ? "sim" : "não"} | ${row.ocrFallbackUsed ? "sim" : "não"} | ${row.confidence ?? "—"} |`,
      );
    }
  }

  lines.push(
    "",
    "## Checklists manuais (Etapas 7–9)",
    "",
    "### PDF protegido",
    "- [ ] Senha correta → importação OK",
    "- [ ] Senha incorreta → `PDF_PASSWORD_REQUIRED` / senha inválida",
    "- [ ] Troca de senha + reprocessamento sem perder histórico",
    "",
    "### Extratos grandes",
    "- [ ] 100 linhas — tabela, performance, lote",
    "- [ ] 300 linhas — tabela, performance, lote",
    "- [ ] 1000 linhas — tabela, performance, lote",
    "",
    "### Telegram",
    "- [ ] PIX — ack imediato, resumo, link review",
    "- [ ] Extrato — ack, resumo batch, review obrigatório",
    "- [ ] Fatura — parcelas, review",
    "- [ ] PDF protegido — solicita senha, reprocessa",
  );

  return lines.join("\n");
}
