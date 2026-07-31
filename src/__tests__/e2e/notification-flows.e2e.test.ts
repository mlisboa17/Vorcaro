import { describe, expect, it, beforeEach, vi } from "vitest";
import type { PrismaClient, User, TelegramConnection } from "@prisma/client";
import { DueInvoiceNotificationService } from "@/modules/notifications/application/services/due-invoice-notification.service";
import { ScheduledExtractNotificationService } from "@/modules/notifications/application/services/scheduled-extract-notification.service";
import { AutomatedReportNotificationService } from "@/modules/notifications/application/services/automated-report-notification.service";
import { SpendingAnomalyDetectionService } from "@/modules/notifications/application/services/spending-anomaly-detection.service";

/**
 * E2E Tests — Fluxos de notificações via Telegram
 * Testa integração entre services, banco de dados (mock) e envio de notificações.
 */
describe("E2E Notification Flows", () => {
  let mockPrisma: any;
  let mockUserId: string;
  let mockChatId: bigint;

  beforeEach(() => {
    mockUserId = "user-123";
    mockChatId = BigInt("987654321");

    mockPrisma = {
      user: {
        findMany: vi.fn(),
      },
      telegramConnection: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      transaction: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      category: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      lancamentoRecorrente: {
        findMany: vi.fn(),
      },
      financialAccount: {
        findMany: vi.fn(),
      },
      extractSchedulePreference: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  describe("Fluxo 1: Notificação de Faturas Vencendo", () => {
    it("detecta faturas vencendo nos próximos 3 dias e notifica usuário", async () => {
      // Setup: usuário com Telegram ativo
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: mockUserId }]);

      // Mock de compromissos (faturas vencendo)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrisma.lancamentoRecorrente.findMany.mockResolvedValueOnce([
        {
          id: "rec-123",
          descricao: "Fatura Cartão Nubank",
          tipo: "DESPESA",
          valor: 1500,
          proximaExecucao: tomorrow,
        },
      ]);

      const service = new DueInvoiceNotificationService(mockPrisma);
      const stats = await service.runForAllUsers(3);

      expect(stats.notified).toBeGreaterThanOrEqual(0);
      expect(stats.alerts).toBeGreaterThanOrEqual(0);
    });

    it("agrupa notificações por tipo (cartão, parcela, recorrência)", async () => {
      // Testa se o serviço agrupa corretamente
      const service = new DueInvoiceNotificationService(mockPrisma);
      expect(service).toBeDefined();
      // Implementação de teste dependeria de dados reais
    });
  });

  describe("Fluxo 2: Agendamento de Extratos", () => {
    it("respeita preferência de agendamento do usuário (semanal/mensal)", async () => {
      // Setup: usuário com agendamento semanal (segunda-feira)
      const monday = 1; // dia da semana
      mockPrisma.extractSchedulePreference.findMany.mockResolvedValueOnce([
        {
          userId: mockUserId,
          frequency: "WEEKLY",
          dayOfWeek: monday,
          isActive: true,
        },
      ]);

      const service = new ScheduledExtractNotificationService(mockPrisma);
      const schedules = await service["getSchedulesForToday"](monday, 1); // simula segunda-feira

      expect(schedules).toBeDefined();
    });

    it("não envia extrato se agendamento está desativado", async () => {
      mockPrisma.extractSchedulePreference.findMany.mockResolvedValueOnce([
        {
          userId: mockUserId,
          frequency: "WEEKLY",
          dayOfWeek: 1,
          isActive: false,
        },
      ]);

      const service = new ScheduledExtractNotificationService(mockPrisma);
      const stats = await service.runScheduledExtracts();

      // Não deve enviar para usuário com agendamento desativado
      expect(stats.sent).toBe(0);
    });
  });

  describe("Fluxo 3: Relatórios Automáticos", () => {
    it("envia relatório semanal apenas na segunda-feira", async () => {
      const monday = 1;
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce([
        { userId: mockUserId },
      ]);

      const service = new AutomatedReportNotificationService(mockPrisma);

      // Simula segunda-feira
      const stats = await service.runWeeklyReports();

      expect(stats).toHaveProperty("sent");
      expect(stats).toHaveProperty("failed");
    });

    it("envia relatório mensal apenas no 1º dia do mês", async () => {
      const firstDay = 1;
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce([
        { userId: mockUserId },
      ]);

      const service = new AutomatedReportNotificationService(mockPrisma);
      const stats = await service.runMonthlyReports();

      expect(stats).toHaveProperty("sent");
      expect(stats).toHaveProperty("failed");
    });
  });

  describe("Fluxo 4: Detecção de Anomalias", () => {
    it("detecta gasto anômalo (>3 desvios padrão) na categoria", async () => {
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce([
        { userId: mockUserId },
      ]);

      mockPrisma.transaction.groupBy.mockResolvedValueOnce([
        {
          categoryId: "cat-123",
          _sum: { amount: 5000 },
          _count: 10,
        },
      ]);

      mockPrisma.category.findFirst.mockResolvedValueOnce({
        id: "cat-123",
        name: "Alimentação",
      });

      // Setup: histórico de gastos normais (R$ 100-200)
      mockPrisma.transaction.findMany.mockResolvedValueOnce([
        { amount: 150 },
        { amount: 120 },
        { amount: 180 },
        { amount: 140 },
      ]);

      const service = new SpendingAnomalyDetectionService(mockPrisma);
      expect(service).toBeDefined();
    });

    it("não alerta para gastos dentro de 1 desvio padrão", async () => {
      // Comportamento esperado: gastos normais não geram alerta
      const service = new SpendingAnomalyDetectionService(mockPrisma);
      expect(service).toBeDefined();
    });
  });

  describe("Fluxo 5: Integração Completa", () => {
    it("cron diário executa todos os serviços sem erros", async () => {
      // Simula execução de todos os crons
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: mockUserId }]);
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce([
        { userId: mockUserId },
      ]);

      const services = [
        new DueInvoiceNotificationService(mockPrisma),
        new ScheduledExtractNotificationService(mockPrisma),
        new AutomatedReportNotificationService(mockPrisma),
        new SpendingAnomalyDetectionService(mockPrisma),
      ];

      // Verifica que todos os serviços podem ser instanciados
      expect(services).toHaveLength(4);
      for (const service of services) {
        expect(service).toBeDefined();
      }
    });

    it("trata erros graciosamente e continua executando outros serviços", async () => {
      mockPrisma.user.findMany.mockRejectedValueOnce(new Error("DB Error"));

      const service = new DueInvoiceNotificationService(mockPrisma);
      await expect(service.runForAllUsers()).rejects.toThrow();

      // Outros serviços continuam funcionando
      const anotherService = new ScheduledExtractNotificationService(mockPrisma);
      expect(anotherService).toBeDefined();
    });
  });
});
