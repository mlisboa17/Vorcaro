import type { FinancialAlertRecord } from "@/modules/financial-alerts/domain/types/financial-alert";
import { getVorcaroDisplayName } from "@/modules/vorcaro/domain/vorcaro-profile";
import { ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS } from "@/types/financial-alerts";

export type TelegramAlertPayload = {
  chatId: string;
  parseMode: "MarkdownV2";
  text: string;
  alertIds: string[];
};

function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export class TelegramAlertFormatter {
  formatSingle(alert: FinancialAlertRecord): string {
    const tipo = ALERT_TYPE_LABELS[alert.type] ?? alert.type;
    const severidade = ALERT_SEVERITY_LABELS[alert.severity] ?? alert.severity;
    const lines = [
      `*${escapeMarkdownV2(alert.title)}*`,
      `Tipo: ${escapeMarkdownV2(tipo)}`,
      `Severidade: ${escapeMarkdownV2(severidade)}`,
      escapeMarkdownV2(alert.description),
    ];
    if (alert.actionUrl) {
      lines.push(`Ação: ${escapeMarkdownV2(alert.actionUrl)}`);
    }
    return lines.join("\n");
  }

  formatDigest(alerts: FinancialAlertRecord[]): TelegramAlertPayload {
    const critical = alerts.filter((a) => a.severity === "CRITICAL");
    const warning = alerts.filter((a) => a.severity === "WARNING");

    const header = escapeMarkdownV2(`${getVorcaroDisplayName()} — alertas financeiros`);
    const parts = [header, ""];

    if (critical.length > 0) {
      parts.push(escapeMarkdownV2(`Críticos (${critical.length}):`));
      for (const a of critical.slice(0, 5)) {
        parts.push(`• ${escapeMarkdownV2(a.title)}: ${escapeMarkdownV2(a.description.slice(0, 120))}`);
      }
    }

    if (warning.length > 0) {
      parts.push(escapeMarkdownV2(`Atenção (${warning.length}):`));
      for (const a of warning.slice(0, 5)) {
        parts.push(`• ${escapeMarkdownV2(a.title)}`);
      }
    }

    if (critical.length === 0 && warning.length === 0) {
      parts.push(escapeMarkdownV2("Nenhum alerta crítico ou de atenção no momento."));
    }

    return {
      chatId: "",
      parseMode: "MarkdownV2",
      text: parts.join("\n"),
      alertIds: alerts.map((a) => a.id),
    };
  }
}
