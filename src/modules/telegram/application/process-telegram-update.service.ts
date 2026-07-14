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
  looksLikeExpenseEntry,
  parseVorcaroTelegramCommand,
  resolveVorcaroTelegramQuestion,
  shouldRouteToVorcaroChat,
  VORCARO_ASSISTANT_INTRO,
} from "@/lib/telegram/vorcaro-telegram-commands";
import {
  buildActionProposalKeyboard,
  parseActionProposalCallback,
  parseFollowUpDismissCallback,
  buildCognitiveTransactionKeyboard,
  parseCognitiveTransactionCallback,
} from "@/lib/telegram/telegram-inline-actions";
import {
  buildDocumentSuggestionKeyboard,
  parseDocumentSuggestionCallback,
} from "@/lib/telegram/telegram-document-actions";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { TelegramFinancialDocumentService } from "@/modules/financial-documents/application/services/telegram-financial-document.service";
import { TELEGRAM_PASSWORD_REQUIRED } from "@/modules/financial-documents/application/services/telegram-document-summary.formatter";
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
import { enqueueStatementImport, getRedisConnection } from "@/lib/queue";
import { processFinancialInboxItem } from "@/lib/queue/process-financial-inbox-item";
import { randomUUID } from "crypto";
import { RegisterCognitiveTransactionUseCase } from "@/modules/transactions/use-cases/register-cognitive-transaction.use-case";
import { ConfirmCognitiveTransactionUseCase } from "@/modules/transactions/use-cases/confirm-cognitive-transaction.use-case";
import { IngestInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/ingest-inbox-item.use-case";
import { GeminiAiService } from "@/modules/financial-inbox/infrastructure/services/gemini-ai.service";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import type { PrismaClient } from "@prisma/client";
import type { TelegramIntegrationPort } from "../domain/ports/telegram-integration.port";
import { CategoryRuleEngine } from "@/modules/automation/services/CategoryRuleEngine";
import { uploadReceipt, deleteReceipt } from "@/lib/supabase-storage";

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

    if (text && (isStartCommand(text) || isHelpCommand(text))) {
      await this.safeReply(
        chatId,
        "Olá! Vorcaro Finance Control.\n\n1) Em <b>Cadastros → Integrações</b>, gere um código.\n2) Envie aqui: <code>/connect SEUCODIGO</code>\n3) Envie comprovantes ou converse com o Vorcaro.\n\nComandos: /status /alertas /gastos /metas /oportunidades /recebiveis\nOu: <code>Vorcaro, como estou financeiramente?</code>",
      );
      return { ok: true, handled: "command" };
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
    const redis = getRedisConnection();

    if (message.message_id) {
      const idempotencyKey = `telegram:msg:${message.message_id}`;
      const isNew = await redis.setnx(idempotencyKey, "1");
      if (isNew === 0) {
        return { ok: true, skipped: "duplicate_message" };
      }
      await redis.expire(idempotencyKey, 86400); // 24h
    }

    if (text) {
      const pendingPasswordKey = `telegram:password_pending:${chatId}`;
      const pendingStr = await redis.get(pendingPasswordKey);
      if (pendingStr) {
        const { documentId } = JSON.parse(pendingStr);
        if (text.toLowerCase() === "cancelar" || text.toLowerCase() === "sair") {
          await redis.del(pendingPasswordKey);
          await this.safeReply(chatId, "❌ Operação de desbloqueio cancelada.");
          return { ok: true, handled: "password_cancelled", channel: "TELEGRAM" };
        }

        await this.safeReply(chatId, "🔑 Processando documento com a senha fornecida...");
        const docService = new TelegramFinancialDocumentService(this.prisma);
        const result = await docService.submitPasswordAndProcess(userId, documentId, text);

        if (result.summary.startsWith("❌ Senha incorreta")) {
          await this.safeReply(chatId, result.summary);
        } else {
          await redis.del(pendingPasswordKey);
          if (result.suggestionId) {
            if (result.allowInlineApproval !== false) {
              await sendTelegramMessageWithMode(chatId, result.summary, "HTML", {
                inline_keyboard: buildDocumentSuggestionKeyboard(result.suggestionId),
              });
            } else {
              await this.safeReply(chatId, result.summary);
            }
          } else {
            await this.safeReply(chatId, result.summary);
          }
        }
        return { ok: true, handled: "password_submitted", channel: "TELEGRAM" };
      }
    }

    const repository = new PrismaInboxRepository(this.prisma);
    const ingestUseCase = new IngestInboxItemUseCase(repository);

    if (hasVoice(message) && message.voice) {
      const inboxItem = await this.prisma.financialInbox.create({
        data: {
          userId,
          channel: "TELEGRAM_VOICE",
          status: "PENDING",
          rawContent: "[Audio Message]",
          channelMeta: {
            telegramFileId: message.voice.file_id,
            mimeType: message.voice.mime_type ?? "audio/ogg",
            chatId: chatId,
          },
        },
      });

      await this.safeReply(chatId, "⏳ Áudio recebido. Processando com Inteligência Artificial...");
      await processFinancialInboxItem(inboxItem.id, userId).catch((error) => {
        console.error("[telegram] processFinancialInboxItem (voice) failed:", error);
      });
      return { ok: true, handled: "voice_enqueued", inboxItemId: inboxItem.id, channel: "TELEGRAM_VOICE" };
    }

    if (hasPhoto(message)) {
      const fileId = getLargestPhotoFileId(message);
      if (!fileId) {
        return { ok: true, skipped: "photo_without_file_id" };
      }
      
      const inboxItem = await this.prisma.financialInbox.create({
        data: {
          userId,
          channel: "TELEGRAM_IMAGE",
          status: "PENDING",
          rawContent: "[Image Message]",
          channelMeta: {
            telegramFileId: fileId,
            mimeType: "image/jpeg",
            chatId: chatId,
          },
        },
      });

      await this.safeReply(chatId, "⏳ Imagem recebida. Extraindo dados do comprovante...");
      await processFinancialInboxItem(inboxItem.id, userId).catch((error) => {
        console.error("[telegram] processFinancialInboxItem (image) failed:", error);
      });
      return { ok: true, handled: "image_enqueued", inboxItemId: inboxItem.id, channel: "TELEGRAM_IMAGE" };
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
          
          if (result.summary === TELEGRAM_PASSWORD_REQUIRED) {
            await redis.setex(`telegram:password_pending:${chatId}`, 300, JSON.stringify({ documentId: result.documentId }));
          }
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

    // Sem indício de valor monetário e sem sinal de recebível: é conversa casual,
    // não uma tentativa de lançamento — responde como assistente em vez de criar
    // um item pendente na Caixa Financeira que nunca faria sentido revisar.
    if (!looksLikeExpenseEntry(text) && !receivableHint.detected) {
      try {
        const chatService = new VorcaroConversationService(this.prisma);
        const result = await chatService.sendMessage({ userId, message: text, channel: "TELEGRAM" });
        await this.safeReplyWithProposals(chatId, result.answer.slice(0, 3900), result.actionProposals);
        return { ok: true, handled: "vorcaro_chat_fallback" };
      } catch (error) {
        const msg =
          error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED"
            ? "Limite de perguntas ao Vorcaro atingido. Tente novamente em breve."
            : "Não entendi. Envie uma despesa (ex.: \"Mercado 50,00\") ou pergunte algo sobre suas finanças.";
        await this.safeReply(chatId, msg);
        return { ok: true, handled: "vorcaro_chat_fallback_failed" };
      }
    }

    const inboxItem = await this.prisma.financialInbox.create({
      data: {
        userId,
        channel: "TELEGRAM",
        status: "PENDING",
        rawContent: text,
        channelMeta: {
          chatId: chatId,
        },
      },
    });

    await this.safeReply(chatId, "⏳ Processando lançamento...");
    await processFinancialInboxItem(inboxItem.id, userId).catch((error) => {
      console.error("[telegram] processFinancialInboxItem (text) failed:", error);
    });

    return { ok: true, handled: "text_enqueued", inboxItemId: inboxItem.id, channel: "TELEGRAM" };
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

    const cognitiveAction = parseCognitiveTransactionCallback(data);
    if (cognitiveAction) {
      try {
        if (cognitiveAction.action === "ack") {
           const confirmUseCase = new ConfirmCognitiveTransactionUseCase();
           const result = await confirmUseCase.execute(connection.userId, cognitiveAction.inboxItemId);
           
           if (!result.success) {
             if ("alreadyProcessed" in result && result.alreadyProcessed) {
               await answerTelegramCallbackQuery(callback.id, "Ação já processada.");
             } else {
               await answerTelegramCallbackQuery(callback.id, "Erro ao confirmar.");
             }
           } else {
             await answerTelegramCallbackQuery(callback.id, "Confirmado!");
             await this.safeReply(chatId, result.message);
           }
        } else {
           const inboxItem = await this.prisma.financialInbox.findUnique({
             where: { id: cognitiveAction.inboxItemId, userId: connection.userId },
             select: { metadata: true }
           });

           await this.prisma.financialInbox.update({
             where: { id: cognitiveAction.inboxItemId, userId: connection.userId },
             data: { status: "ERROR", errorMessage: "Descartado pelo usuário via Telegram" }
           });

           // Executa deleção de forma non-blocking (background) para não segurar o response do Telegram
           if (inboxItem?.metadata && typeof inboxItem.metadata === 'object') {
             const meta = inboxItem.metadata as Record<string, any>;
             if (meta.mediaUrl) {
               deleteReceipt(meta.mediaUrl).catch((err) => {
                 console.error("[Telegram] Erro silencioso ao deletar do Supabase:", err);
               });
             }
           }

           await answerTelegramCallbackQuery(callback.id, "Descartado.");
           await this.safeReply(chatId, "❌ Lançamento descartado.");
        }
        return { ok: true, handled: "cognitive_callback" };
      } catch (err) {
        await answerTelegramCallbackQuery(callback.id, "Erro ao processar ação.");
        return { ok: true, handled: "cognitive_callback_failed" };
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
