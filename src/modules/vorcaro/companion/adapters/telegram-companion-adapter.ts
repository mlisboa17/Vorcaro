/**
 * Telegram Adapter for Companheiro Vorcaro
 * Integrates the companion service with Telegram chat
 */

import type { PrismaClient } from '@prisma/client';
import { VorcaroCompanionService, type CompanionChatResponse } from '../application/services/vorcaro-companion.service';
import { sendTelegramMessage } from '@/lib/telegram/telegram-bot.client';

export class TelegramCompanionAdapter {
  private readonly companionService: VorcaroCompanionService;

  constructor(prisma: PrismaClient) {
    this.companionService = new VorcaroCompanionService(prisma);
  }

  /**
   * Send a companion chat message via Telegram
   */
  async sendCompanionMessage(
    chatId: bigint,
    userId: string,
    userMessage: string,
  ): Promise<CompanionChatResponse> {
    const response = await this.companionService.chat({
      userId,
      message: userMessage,
      channel: 'telegram',
    });

    // Build formatted message for Telegram
    let telegramMessage = response.answer;

    // Add suggestion if available
    if (response.suggestion) {
      telegramMessage += `\n\n💡 ${response.suggestion}`;
    }

    // Add confidence indicator for debugging (optional)
    if (process.env.NODE_ENV === 'development') {
      telegramMessage += `\n\n[${response.provider} • ${(response.confidence * 100).toFixed(0)}%]`;
    }

    // Send via Telegram
    await sendTelegramMessage(chatId, telegramMessage);

    return response;
  }

  /**
   * Detect if message should be routed to companion
   * This is called BEFORE other routing in the telegram service
   */
  static shouldRouteToCompanion(message: string): boolean {
    // Route to companion if it's conversational (not commands)
    // Examples: natural questions, expenses, income reports, context

    // Don't route if it's a command
    if (message.startsWith('/')) {
      return false;
    }

    // Don't route if it's asking for specific commands
    if (message.toLowerCase().includes('comando') || message.toLowerCase().includes('ajuda')) {
      return false;
    }

    // Route natural conversational messages
    // Expenses, income, questions, context
    const naturalPatterns = [
      /gastei|gasto|paguei|pago/i,
      /recebi|ganhei|entrou/i,
      /saldo|quanto|como estou/i,
      /dinheiro|financeiro/i,
      /gasto muito|economizo|poupança/i,
    ];

    return naturalPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Example integration in telegram service
   * This shows where to add companion routing in the process-telegram-update.service.ts
   *
   * // Add this after checking for connection and before cognitive transaction:
   *
   * if (TelegramCompanionAdapter.shouldRouteToCompanion(text)) {
   *   try {
   *     const adapter = new TelegramCompanionAdapter(this.prisma);
   *     const result = await adapter.sendCompanionMessage(
   *       BigInt(chatId),
   *       userId,
   *       text
   *     );
   *     return { ok: true, handled: "companion_chat" };
   *   } catch (error) {
   *     console.error('[Companion] Error:', error);
   *     await this.safeReply(chatId, 'Tive um problema ao processar sua mensagem. Tente novamente.');
   *     return { ok: true, handled: "companion_error" };
   *   }
   * }
   */
}
