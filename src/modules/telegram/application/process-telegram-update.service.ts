import {
  toTelegramImageIngestInput,
  toTelegramTextIngestInput,
  toTelegramVoiceIngestInput,
} from "@/adapters/telegram/mappers/inbox.mapper";
import {
  getLargestPhotoFileId,
  hasPhoto,
  hasVoice,
  isHelpCommand,
  isStartCommand,
  type TelegramMessage,
} from "@/adapters/telegram/types/telegram-update";
import { parseConnectCommand } from "@/lib/telegram/connect-command";
import { downloadTelegramFile, sendTelegramMessage } from "@/lib/telegram/telegram-bot.client";
import { bufferToBase64 } from "@/lib/inbox/parse-inbox-post";
import { enqueueFinancialInboxProcessing } from "@/lib/queue";
import { IngestInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/ingest-inbox-item.use-case";
import { GeminiAiService } from "@/modules/financial-inbox/infrastructure/services/gemini-ai.service";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import type { PrismaClient } from "@prisma/client";
import type { TelegramIntegrationPort } from "../domain/ports/telegram-integration.port";

export type TelegramWebhookResult =
  | { ok: true; handled: string; inboxItemId?: string; channel?: string }
  | { ok: true; skipped: string };

export class ProcessTelegramUpdateService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly telegramIntegration: TelegramIntegrationPort,
  ) {}

  async execute(message: TelegramMessage): Promise<TelegramWebhookResult> {
    const chatId = message.chat.id;
    const username = message.from?.username;
    const firstName = message.from?.first_name;
    const telegramUserId = message.from?.id != null ? BigInt(message.from.id) : null;

    const text = message.text?.trim();

    if (text && (isStartCommand(text) || isHelpCommand(text))) {
      await this.safeReply(
        chatId,
        "Olá! Vorcaro Finance Control.\n\n1) Em <b>Cadastros → Integrações</b>, gere um código.\n2) Envie aqui: <code>/connect SEUCODIGO</code>\n3) Depois envie texto, áudio ou foto de comprovante.",
      );
      return { ok: true, handled: "command" };
    }

    const connectCode = text ? parseConnectCommand(text) : null;
    if (connectCode) {
      try {
        await this.telegramIntegration.consumeConnectCode(
          connectCode,
          BigInt(chatId),
          telegramUserId,
          username ?? null,
          firstName ?? null,
        );
        await this.safeReply(chatId, `Conta vinculada com sucesso. Código <code>${connectCode}</code> aceito.`);
        return { ok: true, handled: "connect" };
      } catch (error) {
        const code = error instanceof Error ? error.message : "CONNECT_FAILED";
        const reply =
          code === "CONNECT_CODE_EXPIRED"
            ? "Código expirado. Gere um novo em Integrações no painel web."
            : code === "CONNECT_CODE_INVALID"
              ? "Código inválido ou já utilizado."
              : code === "CHAT_ALREADY_LINKED"
                ? "Este chat Telegram já está vinculado a outra conta."
                : "Não foi possível vincular. Tente gerar um novo código.";
        await this.safeReply(chatId, reply);
        return { ok: true, handled: "connect_failed" };
      }
    }

    const connection = await this.telegramIntegration.findActiveConnectionByChatId(BigInt(chatId));
    if (!connection) {
      await this.safeReply(
        chatId,
        "Chat não vinculado. Gere um código em Integrações no painel e envie: /connect SEUCODIGO",
      );
      return { ok: true, skipped: "not_connected" };
    }

    const userId = connection.userId;
    const repository = new PrismaInboxRepository(this.prisma);
    const ingestUseCase = new IngestInboxItemUseCase(repository);

    if (hasVoice(message) && message.voice) {
      const { buffer, mimeType } = await downloadTelegramFile(
        message.voice.file_id,
        message.voice.mime_type ?? "audio/ogg",
      );
      const aiService = new GeminiAiService();
      const transcription = await aiService.transcribeAudio({
        type: "audio",
        mimeType,
        base64: bufferToBase64(buffer),
      });
      const ingestInput = toTelegramVoiceIngestInput(userId, {
        rawContent: transcription,
        chatId,
        messageId: message.message_id,
        username,
        voiceFileId: message.voice.file_id,
        duration: message.voice.duration,
      });
      const { id } = await ingestUseCase.execute(ingestInput);
      await enqueueFinancialInboxProcessing({ inboxItemId: id, userId });
      return { ok: true, handled: "voice", inboxItemId: id, channel: "TELEGRAM_VOICE" };
    }

    if (hasPhoto(message)) {
      const fileId = getLargestPhotoFileId(message);
      if (!fileId) {
        return { ok: true, skipped: "photo_without_file_id" };
      }
      const { buffer, mimeType } = await downloadTelegramFile(fileId, "image/jpeg");
      const ingestInput = toTelegramImageIngestInput(userId, {
        chatId,
        messageId: message.message_id,
        username,
        photoFileId: fileId,
        mimeType,
        imageBase64: bufferToBase64(buffer),
      });
      const { id } = await ingestUseCase.execute(ingestInput);
      await enqueueFinancialInboxProcessing({ inboxItemId: id, userId });
      return { ok: true, handled: "image", inboxItemId: id, channel: "TELEGRAM_IMAGE" };
    }

    if (!text) {
      return { ok: true, skipped: "empty_message" };
    }

    const ingestInput = toTelegramTextIngestInput(userId, {
      rawContent: text,
      chatId,
      messageId: message.message_id,
      username,
    });
    const { id } = await ingestUseCase.execute(ingestInput);
    await enqueueFinancialInboxProcessing({ inboxItemId: id, userId });
    return { ok: true, handled: "text", inboxItemId: id, channel: "TELEGRAM" };
  }

  private async safeReply(chatId: number, text: string): Promise<void> {
    try {
      await sendTelegramMessage(chatId, text);
    } catch (error) {
      console.error("[telegram] Falha ao enviar resposta:", error instanceof Error ? error.message : error);
    }
  }
}
