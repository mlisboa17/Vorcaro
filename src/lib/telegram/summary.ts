import type { TelegramInlineKeyboardButton } from "./telegram-inline-actions";
import type { PeriodSummary } from "@/modules/reports/application/services/weekly-summary.service";

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Extrai o nº de dias de comandos como "/resumo", "/resumo 30". Default 7. */
export function parseSummaryDays(text: string): number {
  const m = text.trim().match(/\/resumo(?:@\w+)?\s+(\d{1,3})/i);
  if (m?.[1]) return Number(m[1]);
  return 7;
}

export interface SummaryView {
  text: string;
  keyboard: TelegramInlineKeyboardButton[][];
}

export function buildSummaryView(summary: PeriodSummary): SummaryView {
  const periodo = summary.sinceDays === 7 ? "últimos 7 dias" : `últimos ${summary.sinceDays} dias`;

  if (summary.transactionCount === 0) {
    return {
      text: `📊 <b>Resumo (${periodo})</b>\nSem movimentações no período. 🙂`,
      keyboard: [[{ text: "🏠 Home", callback_data: "home_open" }]],
    };
  }

  const saldoEmoji = summary.netBalance >= 0 ? "🟢" : "🔴";
  const lines = [
    `📊 <b>Resumo (${periodo})</b>`,
    `⬆️ Receitas: ${brl(summary.totalIncome)}`,
    `⬇️ Despesas: ${brl(summary.totalExpenses)}`,
    `${saldoEmoji} Saldo: ${brl(summary.netBalance)}`,
  ];

  if (summary.topCategories.length > 0) {
    lines.push("");
    lines.push("<b>Top categorias:</b>");
    for (const c of summary.topCategories) {
      lines.push(`• ${c.name}: ${brl(c.total)}`);
    }
  }
  if (summary.activeAlerts > 0) {
    lines.push("");
    lines.push(`🔔 ${summary.activeAlerts} alerta${summary.activeAlerts > 1 ? "s" : ""} ativo${summary.activeAlerts > 1 ? "s" : ""}`);
  }

  const insightsLink = `/dashboard/insights?period=${summary.sinceDays}d`;

  const keyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: "📈 Ver detalhes", callback_data: `sum_details:${summary.sinceDays}` },
      { text: "📄 Exportar CSV", callback_data: "sum_export" },
    ],
  ];
  if (summary.activeAlerts > 0) {
    keyboard.push([{ text: "🔔 Ver alertas", callback_data: "home_alerts" }]);
  }

  return { text: lines.join("\n"), keyboard };
}

export interface SummaryCallback {
  action: "details" | "export";
  period?: number;
}

export function parseSummaryCallback(data: string): SummaryCallback | null {
  if (data === "sum_details" || data.startsWith("sum_details:")) {
    const period = data.includes(":") ? Number(data.split(":")[1]) : undefined;
    return { action: "details", period };
  }
  if (data === "sum_export") return { action: "export" };
  return null;
}
