import type { PrismaClient } from "@prisma/client";
import { WeeklySummaryService } from "@/modules/reports/application/services/weekly-summary.service";
import { MonthlyCommitmentsService } from "@/modules/commitments/application/services/monthly-commitments.service";
import { NotificationEventBridgeService } from "./notification-event-bridge.service";

export type ReportFrequency = "WEEKLY" | "MONTHLY";

/**
 * Sprint 22.3 — Relatórios automáticos via Telegram.
 * Envia insights sobre gastos, categorias top, próximos vencimentos.
 * Semanal: segunda-feira (reusa WeeklySummaryService)
 * Mensal: 1º dia do mês (análise completa do mês anterior)
 */
export class AutomatedReportNotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async runWeeklyReports(): Promise<{ sent: number; failed: number }> {
    const users = await this.getUsersWithTelegram();
    let sent = 0;
    let failed = 0;

    for (const userId of users) {
      try {
        await this.sendWeeklyReport(userId);
        sent++;
      } catch (error) {
        console.error(`[AutomatedReport] Falha em relatório semanal ${userId}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  async runMonthlyReports(): Promise<{ sent: number; failed: number }> {
    const users = await this.getUsersWithTelegram();
    let sent = 0;
    let failed = 0;

    for (const userId of users) {
      try {
        await this.sendMonthlyReport(userId);
        sent++;
      } catch (error) {
        console.error(`[AutomatedReport] Falha em relatório mensal ${userId}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  private async sendWeeklyReport(userId: string): Promise<void> {
    const bridge = new NotificationEventBridgeService(this.prisma);
    const summary = await new WeeklySummaryService(this.prisma).build(userId, 7);

    if (summary.transactionCount === 0) {
      return; // Não envia relatório vazio
    }

    const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const lines: string[] = [];

    lines.push("📊 <b>Relatório Semanal Automático</b>");
    lines.push("");
    lines.push(`💰 <b>Movimento da semana:</b>`);
    lines.push(`  ⬆️ Receitas: ${brl(summary.totalIncome)}`);
    lines.push(`  ⬇️ Despesas: ${brl(summary.totalExpenses)}`);
    lines.push(`  ${summary.netBalance >= 0 ? "🟢" : "🔴"} Saldo: ${brl(summary.netBalance)}`);
    lines.push("");

    if (summary.topCategories.length > 0) {
      lines.push(`📈 <b>Top ${summary.topCategories.length} categorias:</b>`);
      for (const cat of summary.topCategories) {
        const pct = ((cat.total / summary.totalExpenses) * 100).toFixed(0);
        lines.push(`  • ${cat.name}: ${brl(cat.total)} (${pct}%)`);
      }
      lines.push("");
    }

    lines.push(`📝 Total de ${summary.transactionCount} transação${summary.transactionCount > 1 ? "s" : ""}`);
    if (summary.activeAlerts > 0) {
      lines.push(`🔔 ${summary.activeAlerts} alerta${summary.activeAlerts > 1 ? "s" : ""} ativo${summary.activeAlerts > 1 ? "s" : ""}`);
    }

    const weekStr = Math.floor(Date.now() / (7 * 86400000));
    await bridge.centerService.publish({
      userId,
      type: "ALERT_CREATED",
      severity: "INFO",
      title: "Relatório Semanal",
      message: lines.join("\n"),
      entityKey: `weekly-report-${weekStr}`,
    });
  }

  private async sendMonthlyReport(userId: string): Promise<void> {
    const bridge = new NotificationEventBridgeService(this.prisma);

    // Pega mês anterior
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    const commitments = await new MonthlyCommitmentsService(this.prisma).execute(userId, monthStr);

    const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const lines: string[] = [];

    lines.push(`📅 <b>Relatório do Mês (${lastMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" })})</b>`);
    lines.push("");

    lines.push(`💾 <b>Resumo Financeiro:</b>`);
    lines.push(`  💸 Entradas: ${brl(commitments.totalInflows)}`);
    lines.push(`  💰 Saídas: ${brl(commitments.totalOutflows)}`);
    lines.push(`  ${commitments.netCommitment >= 0 ? "🟢" : "🔴"} Líquido: ${brl(commitments.netCommitment)}`);
    lines.push("");

    // Resumo por origem
    if (commitments.byOrigin.length > 0) {
      lines.push(`📊 <b>Distribuição por origem:</b>`);
      for (const origin of commitments.byOrigin) {
        lines.push(`  • ${origin.origin}: ${brl(origin.total)} (${origin.count} itens)`);
      }
      lines.push("");
    }

    // Alertas
    if (commitments.overdueCount > 0) {
      lines.push(`🔴 <b>${commitments.overdueCount} item${commitments.overdueCount > 1 ? "ns" : ""} vencido${commitments.overdueCount > 1 ? "s" : ""}</b>`);
    }
    if (commitments.next7DaysCount > 0) {
      lines.push(`🟡 <b>${commitments.next7DaysCount} venciment${commitments.next7DaysCount > 1 ? "os" : "o"} nos próximos 7 dias</b>`);
    }

    lines.push("");
    lines.push(`📌 Total de ${commitments.commitmentsCount} compromissos no período`);

    const monthKey = lastMonth.toISOString().split("T")[0].substring(0, 7);
    await bridge.centerService.publish({
      userId,
      type: "ALERT_CREATED",
      severity: "INFO",
      title: "Relatório Mensal",
      message: lines.join("\n"),
      entityKey: `monthly-report-${monthKey}`,
    });
  }

  private async getUsersWithTelegram(): Promise<string[]> {
    const connections = await this.prisma.telegramConnection.findMany({
      where: { isActive: true },
      distinct: ["userId"],
      select: { userId: true },
    });
    return connections.map((c) => c.userId);
  }
}
