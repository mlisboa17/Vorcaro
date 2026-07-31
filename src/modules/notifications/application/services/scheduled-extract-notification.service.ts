import type { PrismaClient } from "@prisma/client";
import { WeeklySummaryService } from "@/modules/reports/application/services/weekly-summary.service";
import { generateWeeklySummaryCsv } from "@/lib/telegram/weekly-summary-export";
import { sendTelegramDocument } from "@/lib/telegram/telegram-bot.client";
import { sendTelegramMessage } from "@/lib/telegram/telegram-bot.client";

export type ExtractScheduleFrequency = "WEEKLY" | "MONTHLY";

export interface ExtractScheduleConfig {
  userId: string;
  frequency: ExtractScheduleFrequency;
  dayOfWeek?: number; // 0-6 para semanal (0=domingo)
  dayOfMonth?: number; // 1-31 para mensal
  isActive: boolean;
}

/**
 * Sprint 22.2 — Agendamento de extratos automáticos.
 * Envia extratos via Telegram conforme configuração do usuário (semanal/mensal).
 * Reutiliza generateWeeklySummaryCsv() do Sprint 21.
 */
export class ScheduledExtractNotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async runScheduledExtracts(): Promise<{ sent: number; failed: number }> {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();

    let sent = 0;
    let failed = 0;

    // Busca usuários com extratos agendados para hoje
    const schedules = await this.getSchedulesForToday(dayOfWeek, dayOfMonth);

    for (const schedule of schedules) {
      try {
        await this.sendExtractForUser(schedule.userId);
        sent++;
      } catch (error) {
        console.error(`[ScheduledExtract] Falha ao enviar para ${schedule.userId}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  private async getSchedulesForToday(
    dayOfWeek: number,
    dayOfMonth: number,
  ): Promise<ExtractScheduleConfig[]> {
    // Como ainda não temos tabela de agendamentos, busca usuários com Telegram ativo
    // e simula: segunda-feira semanal, 1º do mês mensal
    const schedules: ExtractScheduleConfig[] = [];

    const users = await this.prisma.user.findMany({
      where: {
        telegramConnections: {
          some: { isActive: true },
        },
      },
      select: { id: true },
    });

    for (const user of users) {
      // TODO: quando tabela de agendamentos existir, buscar de lá
      // Por ora, simula segunda-feira semanal
      if (dayOfWeek === 1) {
        schedules.push({
          userId: user.id,
          frequency: "WEEKLY",
          dayOfWeek: 1,
          isActive: true,
        });
      }

      // E 1º do mês para mensal
      if (dayOfMonth === 1) {
        schedules.push({
          userId: user.id,
          frequency: "MONTHLY",
          dayOfMonth: 1,
          isActive: true,
        });
      }
    }

    return schedules;
  }

  private async sendExtractForUser(userId: string): Promise<void> {
    const connection = await this.prisma.telegramConnection.findFirst({
      where: { userId, isActive: true },
      select: { telegramChatId: true },
    });

    if (!connection) {
      throw new Error(`Sem conexão Telegram para ${userId}`);
    }

    const chatId = Number(connection.telegramChatId);

    // Gera resumo (últimos 7 dias)
    const summary = await new WeeklySummaryService(this.prisma).build(userId, 7);
    const csvContent = generateWeeklySummaryCsv(summary);
    const fileName = `resumo_financeiro_${new Date().toISOString().split("T")[0]}.csv`;

    // Envia mensagem + documento
    await sendTelegramMessage(
      chatId,
      "📊 <b>Seu resumo semanal automático</b>\n\nArquivo em CSV anexado para análise detalhada.",
    );

    await sendTelegramDocument(
      chatId,
      fileName,
      csvContent,
      "Resumo Semanal Automático",
    );
  }

  async saveSchedule(config: ExtractScheduleConfig): Promise<void> {
    // TODO: implementar quando tabela de agendamentos existir
    console.log(`[ScheduledExtract] Configuração de agendamento salva: ${JSON.stringify(config)}`);
  }

  async getSchedule(userId: string): Promise<ExtractScheduleConfig | null> {
    // TODO: implementar quando tabela de agendamentos existir
    return null;
  }

  async deleteSchedule(userId: string): Promise<void> {
    // TODO: implementar quando tabela de agendamentos existir
    console.log(`[ScheduledExtract] Agendamento removido para ${userId}`);
  }
}
