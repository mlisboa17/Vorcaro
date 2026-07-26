import type { TelegramInlineKeyboardButton } from "./telegram-inline-actions";

/** Contagens que alimentam a home acionável. */
export interface HomePendingCounts {
  /** Lançamentos aguardando confirmação (inbox NEEDS_CONFIRMATION). */
  pendingConfirmations: number;
  /** Alertas financeiros ativos (engine financial-alerts). */
  activeAlerts: number;
}

export interface HomeView {
  text: string;
  keyboard: TelegramInlineKeyboardButton[][];
}

/** True se há algo a resolver. */
export function hasPending(counts: HomePendingCounts): boolean {
  return counts.pendingConfirmations > 0 || counts.activeAlerts > 0;
}

/** Monta a home: texto curto (1–2 linhas) + botões inline conforme as pendências. */
export function buildHomeView(counts: HomePendingCounts): HomeView {
  const total = counts.pendingConfirmations + counts.activeAlerts;

  if (total === 0) {
    return {
      text: "🏠 <b>Tudo em dia!</b> ✅ Nada pendente por aqui.",
      keyboard: [[{ text: "📊 Ver resumo", callback_data: "home_summary" }]],
    };
  }

  const lines: string[] = [];
  if (counts.pendingConfirmations > 0) {
    lines.push(
      `• ${counts.pendingConfirmations} lançamento${counts.pendingConfirmations > 1 ? "s" : ""} a confirmar`,
    );
  }
  if (counts.activeAlerts > 0) {
    lines.push(`• ${counts.activeAlerts} alerta${counts.activeAlerts > 1 ? "s" : ""} financeiro${counts.activeAlerts > 1 ? "s" : ""}`);
  }

  const text = `🏠 Você tem ${total} pendência${total > 1 ? "s" : ""}:\n${lines.join("\n")}`;

  const keyboard: TelegramInlineKeyboardButton[][] = [];
  const firstRow: TelegramInlineKeyboardButton[] = [];
  if (counts.pendingConfirmations > 0) {
    firstRow.push({ text: "📥 Confirmar lançamentos", callback_data: "home_confirm" });
  }
  if (counts.activeAlerts > 0) {
    firstRow.push({ text: "🔔 Ver alertas", callback_data: "home_alerts" });
  }
  keyboard.push(firstRow);
  keyboard.push([{ text: "📊 Ver resumo", callback_data: "home_summary" }]);

  return { text, keyboard };
}

export type HomeCallback = "confirm" | "alerts" | "summary";

export function parseHomeCallback(data: string): HomeCallback | null {
  if (data === "home_confirm") return "confirm";
  if (data === "home_alerts") return "alerts";
  if (data === "home_summary") return "summary";
  return null;
}
