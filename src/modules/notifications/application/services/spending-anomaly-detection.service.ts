import type { PrismaClient } from "@prisma/client";
import { NotificationEventBridgeService } from "./notification-event-bridge.service";

export interface AnomalyAlert {
  userId: string;
  categoryName: string;
  currentAmount: number;
  historicalAverage: number;
  standardDeviation: number;
  severity: "LOW" | "MEDIUM" | "HIGH"; // desvios: 1-2σ, 2-3σ, >3σ
}

/**
 * Sprint 23.2 — Detecção de gastos anormais.
 * Identifica desvios estatísticos em categorias de gastos do usuário.
 * Usa desvio padrão para detectar comportamento incomum.
 */
export class SpendingAnomalyDetectionService {
  constructor(private readonly prisma: PrismaClient) {}

  async runForAllUsers(): Promise<{ checked: number; anomalies: number }> {
    const users = await this.getUsersWithTelegram();
    let checked = 0;
    let anomalies = 0;

    for (const userId of users) {
      const alerts = await this.detectAnomalies(userId);
      if (alerts.length > 0) {
        await this.notifyUser(userId, alerts);
        anomalies += alerts.length;
      }
      checked++;
    }

    return { checked, anomalies };
  }

  async detectAnomalies(userId: string): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    // Pega todos os gastos dos últimos 90 dias (por categoria)
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const txsByCategory = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        OR: [{ dataCaixa: { gte: since } }, { AND: [{ dataCaixa: null }, { date: { gte: since } }] }],
      },
      _sum: { amount: true },
      _count: true,
    });

    for (const group of txsByCategory) {
      if (!group.categoryId) continue;

      const category = await this.prisma.category.findFirst({
        where: { id: group.categoryId },
        select: { name: true },
      });

      if (!category) continue;

      // Calcula estatísticas por categoria
      const txs = await this.prisma.transaction.findMany({
        where: {
          userId,
          categoryId: group.categoryId,
          type: "EXPENSE",
          OR: [{ dataCaixa: { gte: since } }, { AND: [{ dataCaixa: null }, { date: { gte: since } }] }],
        },
        select: { amount: true },
      });

      if (txs.length < 3) continue; // Precisa de pelo menos 3 transações para análise

      const amounts = txs.map((t) => Math.abs(Number(t.amount)));
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance =
        amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Verifica transações de hoje que desviam da média
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTxs = await this.prisma.transaction.findMany({
        where: {
          userId,
          categoryId: group.categoryId,
          type: "EXPENSE",
          OR: [
            { dataCaixa: { gte: today } },
            { AND: [{ dataCaixa: null }, { date: { gte: today } }] },
          ],
        },
        select: { amount: true },
      });

      // Se houve gastos hoje
      if (todayTxs.length > 0) {
        const todayTotal = todayTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

        if (stdDev > 0) {
          const zScore = Math.abs((todayTotal - mean) / stdDev);

          // 1-2σ = LOW, 2-3σ = MEDIUM, >3σ = HIGH
          let severity: AnomalyAlert["severity"] = "LOW";
          if (zScore > 3) severity = "HIGH";
          else if (zScore > 2) severity = "MEDIUM";
          else if (zScore <= 1) continue; // Não alerta para <1σ

          alerts.push({
            userId,
            categoryName: category.name,
            currentAmount: todayTotal,
            historicalAverage: mean,
            standardDeviation: stdDev,
            severity,
          });
        }
      }
    }

    return alerts.slice(0, 3); // Máximo 3 alertas por usuário
  }

  private async notifyUser(userId: string, alerts: AnomalyAlert[]): Promise<void> {
    const bridge = new NotificationEventBridgeService(this.prisma);

    const lines: string[] = [];
    lines.push("🚨 <b>Anomalias de Gasto Detectadas</b>");
    lines.push("");

    for (const alert of alerts) {
      const emoji = alert.severity === "HIGH" ? "🔴" : "🟠";
      const severityText =
        alert.severity === "HIGH"
          ? "CRÍTICO"
          : alert.severity === "MEDIUM"
            ? "MODERADO"
            : "LEVE";

      const increase = Math.round(((alert.currentAmount - alert.historicalAverage) / alert.historicalAverage) * 100);

      lines.push(`${emoji} <b>${alert.categoryName}</b> (${severityText})`);
      lines.push(`   Hoje: R$ ${alert.currentAmount.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`);
      lines.push(`   Média: R$ ${Math.round(alert.historicalAverage).toLocaleString("pt-BR")}`);
      lines.push(`   Aumento: <b>↑${increase}%</b>`);
      lines.push("");
    }

    lines.push("💡 Dica: Revise seus gastos em /resumo ou /dashboard/insights");

    try {
      await bridge.centerService.publish({
        userId,
        type: "ALERT_CREATED",
        severity: "WARNING",
        title: `${alerts.length} Anomalia${alerts.length > 1 ? "s" : ""} de Gasto`,
        message: lines.join("\n"),
        entityKey: `spending-anomaly-${new Date().toISOString().split("T")[0]}`,
      });
    } catch (error) {
      console.error(`[SpendingAnomaly] Falha ao notificar ${userId}:`, error);
    }
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
