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
import {
  isVorcaroAssistantCommand,
  parseVorcaroTelegramCommand,
  resolveVorcaroTelegramQuestion,
  shouldRouteToVorcaroChat,
  VORCARO_ASSISTANT_INTRO,
} from "@/lib/telegram/vorcaro-telegram-commands";
import {
  buildActionProposalKeyboard,
  parseActionProposalCallback,
  parseFollowUpDismissCallback,
} from "@/lib/telegram/telegram-inline-actions";
import {
  answerTelegramCallbackQuery,
  sendTelegramMessageWithMode,
} from "@/lib/telegram/telegram-bot.client";
import { buildVorcaroActionProposalService } from "@/lib/api/vorcaro-actions";
import { buildVorcaroFollowUpService } from "@/lib/api/vorcaro-followups";
import type { TelegramCallbackQuery } from "@/adapters/telegram/types/telegram-update";
import { VorcaroConversationService } from "@/modules/vorcaro/conversation/application/services/vorcaro-conversation.service";
import { detectReceivableTelegramHint } from "@/lib/telegram/detect-receivable-hint";
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
        "Olá! Vorcaro Finance Control.\n\n1) Em <b>Cadastros → Integrações</b>, gere um código.\n2) Envie aqui: <code>/connect SEUCODIGO</code>\n3) Envie comprovantes ou converse com o Vorcaro.\n\nComandos: /status /alertas /gastos /metas /oportunidades /recebiveis\nOu: <code>Vorcaro, como estou financeiramente?</code>",
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

    if (isVorcaroAssistantCommand(text)) {
      await this.safeReply(chatId, VORCARO_ASSISTANT_INTRO);
      return { ok: true, handled: "vorcaro_intro" };
    }

    if (shouldRouteToVorcaroChat(text)) {
      const helpText = parseVorcaroTelegramCommand(text);
      if (text.trim().toLowerCase().startsWith("/help_vorcaro") && helpText) {
        await this.safeReply(chatId, helpText);
        return { ok: true, handled: "vorcaro_help" };
      }

      try {
        const question = resolveVorcaroTelegramQuestion(text);
        const chatService = new VorcaroConversationService(this.prisma);
        const result = await chatService.sendMessage({
          userId,
          message: question,
          channel: "TELEGRAM",
        });
        await this.safeReplyWithProposals(chatId, result.answer.slice(0, 3900), result.actionProposals);
        return { ok: true, handled: "vorcaro_chat" };
      } catch (error) {
        const msg =
          error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED"
            ? "Limite de perguntas ao Vorcaro atingido. Tente novamente em breve."
            : "Não foi possível consultar o Vorcaro agora. Tente mais tarde.";
        await this.safeReply(chatId, msg);
        return { ok: true, handled: "vorcaro_chat_failed" };
      }
    }

    const receivableHint = detectReceivableTelegramHint(text);
    if (receivableHint.detected && receivableHint.message) {
      const detail =
        receivableHint.amount != null && receivableHint.devedorNome
          ? `\n\nDevedor: <b>${receivableHint.devedorNome}</b>\nValor sugerido: R$ ${receivableHint.amount.toFixed(2).replace(".", ",")}`
          : receivableHint.devedorNome
            ? `\n\nDevedor: <b>${receivableHint.devedorNome}</b>`
            : "";
      await this.safeReply(chatId, `${receivableHint.message}${detail}`);
    }

    const ingestInput = toTelegramTextIngestInput(userId, {
      rawContent: text,
      chatId,
      messageId: message.message_id,
      username,
    });
    const { id } = await ingestUseCase.execute(ingestInput);
    await enqueueFinancialInboxProcessing({ inboxItemId: id, userId });
    // Integração futura: após worker classificar, enviar formatInboxClassificationReply via Telegram.
    return { ok: true, handled: "text", inboxItemId: id, channel: "TELEGRAM" };
  }

  async executeCallback(
    callback: TelegramCallbackQuery,
  ): Promise<TelegramWebhookResult> {
    const chatId = callback.message?.chat.id;
    const data = callback.data?.trim();
    if (!chatId || !data) {
      return { ok: true, skipped: "invalid_callback" };
    }

    const connection = await this.telegramIntegration.findActiveConnectionByChatId(
      BigInt(chatId),
    );
    if (!connection) {
      await answerTelegramCallbackQuery(callback.id, "Chat não vinculado.");
      return { ok: true, skipped: "not_connected" };
    }

    const followUpId = parseFollowUpDismissCallback(data);
    if (followUpId) {
      try {
        await buildVorcaroFollowUpService().dismissFollowUp(connection.userId, followUpId);
        await answerTelegramCallbackQuery(callback.id, "Pendência dispensada.");
        await this.safeReply(chatId, "Pendência marcada como dispensada.");
      } catch {
        await answerTelegramCallbackQuery(callback.id, "Não foi possível dispensar.");
      }
      return { ok: true, handled: "followup_dismiss" };
    }

    const action = parseActionProposalCallback(data);
    if (!action) {
      await answerTelegramCallbackQuery(callback.id);
      return { ok: true, skipped: "unknown_callback" };
    }

    const proposals = buildVorcaroActionProposalService();
    try {
      if (action.action === "approve") {
        const { result } = await proposals.approveAndExecute(connection.userId, action.proposalId);
        await answerTelegramCallbackQuery(callback.id, "Aprovado!");
        const link = result.targetUrl ? `\n\nAbra: ${result.targetUrl}` : "";
        await this.safeReply(chatId, `${result.message}${link}`);
      } else {
        await proposals.rejectProposal(connection.userId, action.proposalId);
        await answerTelegramCallbackQuery(callback.id, "Rejeitado.");
        await this.safeReply(chatId, "Proposta rejeitada.");
      }
      return { ok: true, handled: "vorcaro_action_callback" };
    } catch {
      await answerTelegramCallbackQuery(callback.id, "Ação indisponível ou expirada.");
      return { ok: true, handled: "vorcaro_action_callback_failed" };
    }
  }

  private async safeReply(chatId: number, text: string): Promise<void> {
    try {
      await sendTelegramMessage(chatId, text);
    } catch (error) {
      console.error("[telegram] Falha ao enviar resposta:", error instanceof Error ? error.message : error);
    }
  }

  private async safeReplyWithProposals(
    chatId: number,
    text: string,
    proposals?: Array<{ id: string }>,
  ): Promise<void> {
    try {
      if (proposals?.length) {
        await sendTelegramMessageWithMode(chatId, text, "HTML", {
          inline_keyboard: buildActionProposalKeyboard(proposals),
        });
        return;
      }
      await sendTelegramMessage(chatId, text);
    } catch (error) {
      console.error("[telegram] Falha ao enviar resposta:", error instanceof Error ? error.message : error);
    }
  }
}
