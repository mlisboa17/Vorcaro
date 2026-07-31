import type { PrismaClient } from "@prisma/client";
import { MonthlyCommitmentsService } from "@/modules/commitments/application/services/monthly-commitments.service";
import { NotificationEventBridgeService } from "./notification-event-bridge.service";

export interface DueInvoiceAlert {
  userId: string;
  description: string;
  daysUntilDue: number;
  amount: number;
}

/**
 * Detecta faturas e parcelas vencendo nos próximos N dias e envia notificações via Telegram.
 * Roda diariamente para agrupar avisos por usuário e evitar spam.
 */
export class DueInvoiceNotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async runForAllUsers(daysUntilDue = 3): Promise<{ notified: number; alerts: number }> {
    const users = await this.prisma.user.findMany({
      where: {
        telegramConnections: {
          some: { isActive: true },
        },
      },
      select: { id: true },
    });

    let notified = 0;
    let alerts = 0;

    for (const user of users) {
      const userAlerts = await this.getUserDueInvoices(user.id, daysUntilDue);
      if (userAlerts.length > 0) {
        await this.notifyUser(user.id, userAlerts);
        notified++;
        alerts += userAlerts.length;
      }
    }

    return { notified, alerts };
  }

  private async getUserDueInvoices(userId: string, daysUntilDue: number): Promise<DueInvoiceAlert[]> {
    const today = new Date();
    const endDate = new Date(today.getTime() + daysUntilDue * 86400000);

    // Pega o mês atual e próximo para análise
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

    const alerts: DueInvoiceAlert[] = [];

    // Analisa mês atual e próximo
    for (const month of [currentMonth, nextMonthStr]) {
      try {
        const commitments = await new MonthlyCommitmentsService(this.prisma).execute(userId, month);

        for (const item of commitments.items) {
          const itemDate = new Date(item.dataPrevista + "T00:00:00Z");

          // Filtra apenas itens que vencem nos próximos N dias (vencidos ou próximos)
          const isWithinRange = itemDate >= today && itemDate <= endDate;
          const isAlert = item.status === "OVERDUE" || (item.status === "PENDING" && isWithinRange);

          if (isAlert) {
            const daysUntil = Math.ceil((itemDate.getTime() - today.getTime()) / 86400000);
            alerts.push({
              userId,
              description: item.descricao,
              daysUntilDue: daysUntil,
              amount: item.valor,
            });
          }
        }
      } catch {
        // Ignora erros de mês futuro
      }
    }

    // Ordena por dias restantes
    return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  private async notifyUser(userId: string, alerts: DueInvoiceAlert[]): Promise<void> {
    const bridge = new NotificationEventBridgeService(this.prisma);

    // Agrupa por tipo de alerta (fatura de cartão, parcela, recorrência)
    const grouped = new Map<string, DueInvoiceAlert[]>();
    for (const alert of alerts) {
      const type = alert.description.includes("cartão")
        ? "cartão"
        : alert.description.includes("parcela")
          ? "parcela"
          : "recorrência";
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(alert);
    }

    // Monta mensagem agrupada
    const lines: string[] = [];
    lines.push("💳 <b>Faturas e parcelas vencendo:</b>");
    lines.push("");

    for (const [type, items] of grouped) {
      const icon =
        type === "cartão" ? "🏦" : type === "parcela" ? "📦" : "🔄";
      lines.push(`${icon} <b>${type}:</b>`);

      const total = items.reduce((sum, a) => sum + a.amount, 0);
      for (const item of items.slice(0, 3)) {
        const emoji = item.daysUntilDue === 0 ? "🔴" : "🟡";
        const daysText = item.daysUntilDue === 0 ? "hoje" : `em ${item.daysUntilDue} dia${item.daysUntilDue > 1 ? "s" : ""}`;
        lines.push(`  ${emoji} ${item.description} — ${daysText}`);
      }

      if (items.length > 3) {
        lines.push(`  + ${items.length - 3} outra${items.length - 3 > 1 ? "s" : ""}`);
      }

      lines.push(`  💰 Total: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
      lines.push("");
    }

    lines.push("📊 Veja o resumo completo em /dashboard/statements 👉");

    try {
      const today = new Date().toISOString().split("T")[0];
      await bridge.centerService.publish({
        userId,
        type: "ALERT_CREATED",
        severity: "WARNING",
        title: "Faturas vencendo",
        message: lines.join("\n"),
        entityKey: `due-invoices-${today}`,
      });
    } catch (error) {
      console.error(`[DueInvoiceNotification] Falha ao notificar ${userId}:`, error);
    }
  }
}
