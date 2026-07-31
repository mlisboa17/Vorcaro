import type { PeriodSummary } from "@/modules/reports/application/services/weekly-summary.service";

/** Gera CSV puro-JS a partir do resumo semanal (sem dependências externas). */
export function generateWeeklySummaryCsv(summary: PeriodSummary): string {
  const brl = (value: number): string =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const periodo = summary.sinceDays === 7 ? "últimos 7 dias" : `últimos ${summary.sinceDays} dias`;
  const timestamp = new Date().toLocaleString("pt-BR");

  const lines: string[] = [];

  // Cabeçalho
  lines.push(`"Resumo Financeiro (${periodo})"`);
  lines.push(`"Gerado em","${timestamp}"`);
  lines.push("");

  // Resumo geral
  lines.push(`"RESUMO GERAL"`);
  lines.push(`"Total de Transações","${summary.transactionCount}"`);
  lines.push(`"Total de Receitas","${brl(summary.totalIncome)}"`);
  lines.push(`"Total de Despesas","${brl(summary.totalExpenses)}"`);
  lines.push(`"Saldo Líquido","${brl(summary.netBalance)}"`);
  lines.push("");

  // Top categorias
  if (summary.topCategories.length > 0) {
    lines.push(`"TOP CATEGORIAS DE DESPESA"`);
    lines.push(`"Categoria","Valor Total"`);
    for (const cat of summary.topCategories) {
      const escaped = escapeCSVField(cat.name);
      lines.push(`"${escaped}","${brl(cat.total)}"`);
    }
    lines.push("");
  }

  // Alertas
  if (summary.activeAlerts > 0) {
    lines.push(`"ALERTAS"`);
    lines.push(`"Alertas Ativos","${summary.activeAlerts}"`);
  }

  return lines.join("\r\n");
}

/** Escapa aspas e quebras de linha em campos CSV. */
function escapeCSVField(field: string): string {
  if (!field) return "";
  // Se o campo contém aspas, quebras de linha ou vírgulas, escapa as aspas internas
  if (field.includes('"') || field.includes("\n") || field.includes(",")) {
    return field.replace(/"/g, '""');
  }
  return field;
}
