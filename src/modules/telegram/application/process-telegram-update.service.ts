import {
  toTelegramImageIngestInput,
  toTelegramTextIngestInput,
  toTelegramVoiceIngestInput,
} from "@/adapters/telegram/mappers/inbox.mapper";
import {
  getLargestPhotoFileId,
  hasDocument,
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
  buildDocumentSuggestionKeyboard,
  parseDocumentSuggestionCallback,
} from "@/lib/telegram/telegram-document-actions";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { TelegramFinancialDocumentService } from "@/modules/financial-documents/application/services/telegram-financial-document.service";
import { FinancialDocumentUploadError } from "@/modules/financial-documents/application/services/financial-document-upload.service";
import { FinancialDocumentSuggestionError } from "@/modules/financial-documents/application/services/financial-document-suggestion.service";
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
import { enqueueFinancialInboxProcessing, enqueueStatementImport, getRedisConnection } from "@/lib/queue";
import { randomUUID } from "crypto";
import { IngestInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/ingest-inbox-item.use-case";
import { GeminiAiService } from "@/modules/financial-inbox/infrastructure/services/gemini-ai.service";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import type { PrismaClient } from "@prisma/client";
import type { TelegramIntegrationPort } from "../domain/ports/telegram-integration.port";
import { CategoryRuleEngine } from "@/modules/automation/services/CategoryRuleEngine";

export type TelegramWebhookResult =
  | { ok: true; handled: string; inboxItemId?: string; channel?: string }
  | { ok: true; skipped: string };

export class ProcessTelegramUpdateService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly telegramIntegration: TelegramIntegrationPort,
  ) { }

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
      await this.safeReply(chatId, "✅ Áudio recebido e enviado para transcrição na Caixa Financeira!");
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
      await this.safeReply(chatId, "✅ Imagem recebida e enviada para extração na Caixa Financeira!");
      return { ok: true, handled: "image", inboxItemId: id, channel: "TELEGRAM_IMAGE" };
    }

    if (hasDocument(message) && message.document) {
      const mimeType = message.document.mime_type ?? "application/octet-stream";
      const fileName = message.document.file_name ?? "documento";
      const ext = fileName.split(".").pop()?.toLowerCase();

      if (ext === "ofx" || ext === "csv") {
        const accounts = await this.prisma.financialAccount.findMany({
          where: { userId, isActive: true },
          select: { id: true, name: true },
        });

        if (accounts.length === 0) {
          await this.safeReply(chatId, "⚠️ Cadastre uma conta bancária ativa no Dashboard primeiro.");
          return { ok: true, handled: "statement_no_account", channel: "TELEGRAM" };
        }

        if (accounts.length === 1) {
          await enqueueStatementImport({
            fileId: message.document.file_id,
            fileName,
            userId,
            chatId,
            accountId: accounts[0].id,
          });
          await this.safeReply(chatId, `✅ Arquivo de extrato recebido! O processamento em lote foi agendado na conta *${accounts[0].name}* e você será notificado assim que for concluído.`);
          return { ok: true, handled: "statement_queued", channel: "TELEGRAM" };
        }

        const pendingId = randomUUID().split("-")[0];
        const redis = getRedisConnection();
        await redis.setex(
          `telegram:stmt:${pendingId}`,
          3600,
          JSON.stringify({ fileId: message.document.file_id, fileName, userId, chatId })
        );

        const inline_keyboard = accounts.map(acc => [{
          text: acc.name,
          callback_data: `stmt_acc:${pendingId}:${acc.id}`
        }]);

        await sendTelegramMessageWithMode(chatId, "Detectamos mais de uma conta ativa. Selecione o destino do extrato:", "HTML", {
          inline_keyboard
        });

        return { ok: true, handled: "statement_pending_account", channel: "TELEGRAM" };
      }

      const { buffer } = await downloadTelegramFile(message.document.file_id, mimeType);
      const docService = new TelegramFinancialDocumentService(this.prisma);

      try {
        const result = await docService.ingestAndProcess({
          userId,
          fileName,
          mimeType,
          buffer,
        });

        if (result.suggestionId) {
          if (result.immediateAck) {
            await this.safeReply(chatId, result.immediateAck);
          }
          if (result.allowInlineApproval !== false) {
            await sendTelegramMessageWithMode(chatId, result.summary, "HTML", {
              inline_keyboard: buildDocumentSuggestionKeyboard(result.suggestionId),
            });
          } else {
            await this.safeReply(chatId, result.summary);
          }
        } else {
          if (result.immediateAck) {
            await this.safeReply(chatId, result.immediateAck);
          }
          await this.safeReply(chatId, result.summary);
        }
        return { ok: true, handled: "document", channel: "TELEGRAM" };
      } catch (error) {
        const msg =
          error instanceof FinancialDocumentUploadError
            ? error.message
            : "Não foi possível processar o documento. Tente novamente ou use o dashboard.";
        await this.safeReply(chatId, msg);
        return { ok: true, handled: "document_failed" };
      }
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

    const ruleEngine = new CategoryRuleEngine();
    const match = await ruleEngine.execute(text, userId);

    const ingestInput = toTelegramTextIngestInput(userId, {
      rawContent: text,
      chatId,
      messageId: message.message_id,
      username,
    });

    if (match) {
      // @ts-ignore: Injetando categoryId no meta para o Inbox aproveitar
      ingestInput.channelMeta.categoryId = match.categoryId;
      // @ts-ignore
      ingestInput.channelMeta.ruleId = match.ruleId;
    }
    const { id } = await ingestUseCase.execute(ingestInput);
    await enqueueFinancialInboxProcessing({ inboxItemId: id, userId });
    await this.safeReply(chatId, "✅ Recebido! Já enviei para classificação na Caixa Financeira.");
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

    if (data.startsWith("stmt_acc:")) {
      const parts = data.split(":");
      if (parts.length === 3) {
        const pendingId = parts[1];
        const accountId = parts[2];
        const redis = getRedisConnection();
        const payloadStr = await redis.get(`telegram:stmt:${pendingId}`);
        if (!payloadStr) {
          await answerTelegramCallbackQuery(callback.id, "Sessão expirada. Envie o arquivo novamente.");
          return { ok: true, handled: "statement_expired" };
        }
        const payload = JSON.parse(payloadStr);
        await enqueueStatementImport({
          ...payload,
          accountId
        });
        await answerTelegramCallbackQuery(callback.id, "Conta selecionada!");
        await this.safeReply(chatId, "✅ Conta selecionada! O processamento em lote foi agendado.");
        return { ok: true, handled: "statement_queued" };
      }
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

    const docAction = parseDocumentSuggestionCallback(data);
    if (docAction) {
      const { suggestion } = buildFinancialDocumentServices(this.prisma);
      try {
        if (docAction.action === "approve") {
          try {
            const result = await suggestion.approve(connection.userId, docAction.suggestionId);
            await answerTelegramCallbackQuery(callback.id, "Lançamento criado!");
            await this.safeReply(
              chatId,
              `Lançamento confirmado após sua revisão. ID: ${result.transactionId}`,
            );
          } catch (approveError) {
            if (
              approveError instanceof FinancialDocumentSuggestionError &&
              approveError.code === "LOW_CONFIDENCE_REVIEW_REQUIRED"
            ) {
              await answerTelegramCallbackQuery(callback.id, "Revise no dashboard.");
              await this.safeReply(
                chatId,
                "⚠️ Os dados extraídos possuem baixa confiança. Revise e edite em /dashboard/import/review antes de aprovar.",
              );
            } else {
              throw approveError;
            }
          }
        } else if (docAction.action === "reject") {
          await suggestion.reject(connection.userId, docAction.suggestionId);
          await answerTelegramCallbackQuery(callback.id, "Rejeitado.");
          await this.safeReply(chatId, "Sugestão rejeitada. Nenhum lançamento foi criado.");
        } else {
          await answerTelegramCallbackQuery(callback.id, "Abra o dashboard.");
          await this.safeReply(
            chatId,
            "Edite a sugestão em: /dashboard/import/review",
          );
        }
        return { ok: true, handled: "document_suggestion_callback" };
      } catch {
        await answerTelegramCallbackQuery(callback.id, "Ação indisponível.");
        return { ok: true, handled: "document_suggestion_callback_failed" };
      }
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
