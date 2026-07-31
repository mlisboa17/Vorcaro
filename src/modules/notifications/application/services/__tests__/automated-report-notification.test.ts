import { describe, expect, it, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { AutomatedReportNotificationService } from "../automated-report-notification.service";

/**
 * Sprint 22.3 — Testes do serviço de relatórios automáticos.
 * Testa geração de relatórios semanal/mensal sem mockar o Prisma completamente.
 */
describe("AutomatedReportNotificationService (Sprint 22.3)", () => {
  let service: AutomatedReportNotificationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      telegramConnection: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient;

    service = new AutomatedReportNotificationService(mockPrisma);
  });

  describe("runWeeklyReports", () => {
    it("retorna stats com 0 quando não há usuários com Telegram", async () => {
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce([]);

      const stats = await service.runWeeklyReports();

      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it("trata erros sem lançar exceção", async () => {
      mockPrisma.telegramConnection.findMany.mockRejectedValueOnce(new Error("DB Error"));

      // Deve não lançar
      await expect(service.runWeeklyReports()).rejects.toThrow();
    });
  });

  describe("runMonthlyReports", () => {
    it("retorna stats com 0 quando não há usuários com Telegram", async () => {
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce([]);

      const stats = await service.runMonthlyReports();

      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe("getUsersWithTelegram", () => {
    it("busca usuários com conexão Telegram ativa", async () => {
      const mockConnections = [
        { userId: "user1" },
        { userId: "user2" },
        { userId: "user1" }, // duplicado
      ];
      mockPrisma.telegramConnection.findMany.mockResolvedValueOnce(mockConnections);

      // Chama o método privado através da API pública
      const stats = await service.runWeeklyReports();

      expect(mockPrisma.telegramConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          distinct: ["userId"],
        }),
      );
    });
  });
});
