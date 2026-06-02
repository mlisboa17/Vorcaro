import type { PrismaClient } from "@prisma/client";
import type { TelegramIntegrationPort, TelegramConnectionRecord } from "../domain/ports/telegram-integration.port";

function toConnection(row: {
  id: string;
  userId: string;
  telegramChatId: bigint;
  telegramUserId: bigint | null;
  username: string | null;
  firstName: string | null;
  connectedAt: Date;
}): TelegramConnectionRecord {
  return {
    id: row.id,
    userId: row.userId,
    telegramChatId: row.telegramChatId,
    telegramUserId: row.telegramUserId,
    username: row.username,
    firstName: row.firstName,
    connectedAt: row.connectedAt,
  };
}

export class PrismaTelegramIntegrationRepository implements TelegramIntegrationPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveConnectionByChatId(telegramChatId: bigint): Promise<TelegramConnectionRecord | null> {
    const row = await this.prisma.telegramConnection.findFirst({
      where: { telegramChatId, isActive: true },
    });
    return row ? toConnection(row) : null;
  }

  async findActiveConnectionByUserId(userId: string): Promise<TelegramConnectionRecord | null> {
    const row = await this.prisma.telegramConnection.findFirst({
      where: { userId, isActive: true },
      orderBy: { connectedAt: "desc" },
    });
    return row ? toConnection(row) : null;
  }

  async createConnectCode(userId: string, code: string, expiresAt: Date) {
    await this.prisma.telegramConnectCode.deleteMany({
      where: { userId, usedAt: null },
    });

    await this.prisma.telegramConnectCode.create({
      data: { userId, code, expiresAt },
    });

    return { code, expiresAt };
  }

  async consumeConnectCode(
    code: string,
    telegramChatId: bigint,
    telegramUserId: bigint | null,
    username: string | null,
    firstName: string | null,
  ): Promise<{ userId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.telegramConnectCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!pending || pending.usedAt) {
        throw new Error("CONNECT_CODE_INVALID");
      }

      if (pending.expiresAt < new Date()) {
        throw new Error("CONNECT_CODE_EXPIRED");
      }

      const existingChat = await tx.telegramConnection.findUnique({
        where: { telegramChatId },
      });

      if (existingChat?.isActive && existingChat.userId !== pending.userId) {
        throw new Error("CHAT_ALREADY_LINKED");
      }

      await tx.telegramConnectCode.update({
        where: { id: pending.id },
        data: { usedAt: new Date() },
      });

      await tx.telegramConnection.updateMany({
        where: { userId: pending.userId, isActive: true },
        data: { isActive: false },
      });

      if (existingChat) {
        await tx.telegramConnection.update({
          where: { id: existingChat.id },
          data: {
            userId: pending.userId,
            telegramUserId,
            username,
            firstName,
            isActive: true,
            connectedAt: new Date(),
          },
        });
      } else {
        await tx.telegramConnection.create({
          data: {
            userId: pending.userId,
            telegramChatId,
            telegramUserId,
            username,
            firstName,
          },
        });
      }

      return { userId: pending.userId };
    });
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.telegramConnection.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }
}
