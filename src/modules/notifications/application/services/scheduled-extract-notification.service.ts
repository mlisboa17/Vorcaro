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
    // Sprint 22.2 — busca agendamentos configurados pelo usuário
    const prefs = await this.prisma.extractSchedulePreference.findMany({
      where: { isActive: true },
    });

    const schedules: ExtractScheduleConfig[] = [];

    for (const pref of prefs) {
      if (pref.frequency === "WEEKLY" && pref.dayOfWeek === dayOfWeek) {
        schedules.push({
          userId: pref.userId,
          frequency: "WEEKLY",
          dayOfWeek: pref.dayOfWeek ?? 1,
          isActive: true,
        });
      } else if (pref.frequency === "MONTHLY" && pref.dayOfMonth === dayOfMonth) {
        schedules.push({
          userId: pref.userId,
          frequency: "MONTHLY",
          dayOfMonth: pref.dayOfMonth ?? 1,
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
    await this.prisma.extractSchedulePreference.upsert({
      where: { userId: config.userId },
      update: {
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        isActive: config.isActive,
      },
      create: {
        userId: config.userId,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        isActive: config.isActive,
      },
    });
  }

  async getSchedule(userId: string): Promise<ExtractScheduleConfig | null> {
    const pref = await this.prisma.extractSchedulePreference.findUnique({
      where: { userId },
    });
    if (!pref) return null;
    return {
      userId: pref.userId,
      frequency: pref.frequency as ExtractScheduleFrequency,
      dayOfWeek: pref.dayOfWeek ?? undefined,
      dayOfMonth: pref.dayOfMonth ?? undefined,
      isActive: pref.isActive,
    };
  }

  async deleteSchedule(userId: string): Promise<void> {
    await this.prisma.extractSchedulePreference.deleteMany({
      where: { userId },
    });
  }
}
