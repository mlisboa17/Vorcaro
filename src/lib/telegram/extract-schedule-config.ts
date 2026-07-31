import type { TelegramInlineKeyboardButton } from "./telegram-inline-actions";

export type ExtractScheduleCallback = "weekly" | "monthly" | "disable" | "confirm";

export interface ExtractScheduleView {
  text: string;
  keyboard: TelegramInlineKeyboardButton[][];
}

/**
 * Sprint 22.2 — Interface de configuração de agendamento de extratos no Telegram.
 * Permite ao usuário ativar/desativar e escolher frequência (semanal/mensal).
 */
export function buildExtractScheduleView(currentFrequency?: string | null): ExtractScheduleView {
  const lines: string[] = [];
  lines.push("📊 <b>Agendamento de Extratos</b>");
  lines.push("");
  lines.push("Receba seus resumos financeiros automaticamente via Telegram.");
  lines.push("");

  if (currentFrequency) {
    lines.push(
      `✅ Agendamento ativo: <b>${
        currentFrequency === "WEEKLY" ? "Semanal (segundas)" : "Mensal (1º dia)"
      }</b>`,
    );
    lines.push("");
    lines.push("Deseja mudar a frequência?");
  } else {
    lines.push("❌ Agendamento desativado.");
    lines.push("");
    lines.push("Ative um agendamento para receber relatórios automáticos:");
  }

  const keyboard: TelegramInlineKeyboardButton[][] = [];

  if (!currentFrequency) {
    keyboard.push([
      { text: "📅 Semanal (segundas)", callback_data: "extract_weekly" },
      { text: "📆 Mensal (1º dia)", callback_data: "extract_monthly" },
    ]);
  } else {
    keyboard.push([
      { text: "📅 Semanal (segundas)", callback_data: "extract_weekly" },
      { text: "📆 Mensal (1º dia)", callback_data: "extract_monthly" },
    ]);
    keyboard.push([{ text: "❌ Desativar", callback_data: "extract_disable" }]);
  }

  keyboard.push([{ text: "🏠 Voltar", callback_data: "home_open" }]);

  return { text: lines.join("\n"), keyboard };
}

export function parseExtractScheduleCallback(data: string): ExtractScheduleCallback | null {
  if (data === "extract_weekly") return "weekly";
  if (data === "extract_monthly") return "monthly";
  if (data === "extract_disable") return "disable";
  if (data === "extract_confirm") return "confirm";
  return null;
}

export function buildExtractScheduleConfirmView(frequency: string): ExtractScheduleView {
  const lines: string[] = [];
  lines.push("✅ <b>Configuração Salva!</b>");
  lines.push("");

  if (frequency === "WEEKLY") {
    lines.push("📅 Você receberá relatórios <b>toda segunda-feira</b> às 5h da manhã.");
    lines.push("");
    lines.push("O resumo incluirá:");
    lines.push("  • Receitas e despesas da semana");
    lines.push("  • Top 3 categorias de gastos");
    lines.push("  • Saldo líquido");
    lines.push("  • Alertas financeiros ativos");
  } else {
    lines.push("📆 Você receberá relatórios <b>no 1º dia de cada mês</b> às 5h da manhã.");
    lines.push("");
    lines.push("O resumo incluirá:");
    lines.push("  • Análise completa do mês anterior");
    lines.push("  • Distribuição por origem (cartão, parcelas, recorrências...)");
    lines.push("  • Faturas e parcelas vencidas");
    lines.push("  • Próximos vencimentos (próximos 7 dias)");
  }

  lines.push("");
  lines.push("💡 Você pode mudar isso a qualquer momento com /extratos");

  return {
    text: lines.join("\n"),
    keyboard: [[{ text: "👍 Entendi", callback_data: "home_open" }]],
  };
}
