import type { WeeklyInsight } from "@/modules/reports/application/services/weekly-insights.service";

export interface WeeklyInsightsView {
  text: string;
  hasInsights: boolean;
}

/**
 * Sprint 23.1 — Formatação de insights para Telegram.
 * Traduz análise de padrões em mensagens claras e acionáveis.
 */
export function formatWeeklyInsightsForTelegram(insight: WeeklyInsight): WeeklyInsightsView {
  const lines: string[] = [];
  let hasInsights = false;

  lines.push("📊 <b>Insights da Sua Semana</b>");
  lines.push("");

  // Tendência geral
  if (insight.spendingTrend === "increasing") {
    lines.push(`📈 <b>Alerta:</b> Sua semana foi <b>${insight.anomalies[0]?.split("%")[1] || "acima da média"}</b>`);
    lines.push("");
    hasInsights = true;
  }

  // Aumentos de gasto
  if (insight.topIncreases.length > 0) {
    lines.push("<b>💰 Você gastou mais em:</b>");
    for (const cat of insight.topIncreases.slice(0, 2)) {
      const emoji =
        cat.percentageChange > 50
          ? "🔴"
          : cat.percentageChange > 30
            ? "🟠"
            : "🟡";
      lines.push(
        `  ${emoji} ${cat.name}: <b>↑${cat.percentageChange}%</b> (R$ ${cat.currentSpent.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} vs R$ ${Math.round(cat.historicalAverage).toLocaleString("pt-BR")} média)`,
      );
    }
    lines.push("");
    hasInsights = true;
  }

  // Economias
  if (insight.topSavings.length > 0) {
    lines.push("<b>💚 Você economizou em:</b>");
    for (const cat of insight.topSavings.slice(0, 2)) {
      lines.push(
        `  ✅ ${cat.name}: R$ ${Math.round(cat.historicalAverage).toLocaleString("pt-BR")} poupado (zero gasto vs média)`,
      );
    }
    lines.push("");
    hasInsights = true;
  }

  // Maior gasto
  if (insight.largestExpense) {
    lines.push(`<b>💸 Maior gasto:</b> ${insight.largestExpense.description}`);
    lines.push(
      `   Categoria: ${insight.largestExpense.category} | Valor: R$ ${insight.largestExpense.amount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`,
    );
    lines.push("");
  }

  // Anomalias adicionais
  if (insight.anomalies.length > 0) {
    lines.push("<b>⚠️ Atenção:</b>");
    for (const anomaly of insight.anomalies) {
      lines.push(`  • ${anomaly}`);
    }
    lines.push("");
  }

  if (!hasInsights) {
    lines.push("✅ Semana equilibrada! Seus gastos estão dentro da média.");
  } else {
    lines.push("💡 <i>Dica: Clique em /resumo para ver o detalhamento completo.</i>");
  }

  return {
    text: lines.join("\n"),
    hasInsights,
  };
}
