import { prisma } from "@/lib/prisma";
import { ProcessInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/process-inbox-item.use-case";
import { EnrichExtractionUseCase } from "@/modules/financial-inbox/application/use-cases/enrich-extraction.use-case";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";
import { PrismaUserRuleRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-rule.repository";
import { GeminiAiService } from "@/modules/financial-inbox/infrastructure/services/gemini-ai.service";
import { PrismaCategoryConfigRepository } from "@/modules/financial-config/infrastructure/repositories/prisma-category-config.repository";
import {
  PrismaCardRepository,
  PrismaFinancialAccountRepository,
  PrismaInstrumentLookupService,
  PrismaPaymentMethodRepository,
} from "@/modules/financial-instruments/infrastructure/repositories/prisma-financial-instrument.repositories";
import { InboxClassificationService } from "@/modules/inbox-intelligence/application/services/inbox-classification.service";
import { mergeClassificationIntoExtraction } from "@/lib/inbox/apply-inbox-classification";
import { resolveAutomationTier } from "@/modules/inbox-intelligence/domain/types/inbox-automation-policy";
import { handleInboxSmartBatchExecute } from "@/lib/inbox/handle-inbox-smart-batch-execute";
import { downloadTelegramFile, sendTelegramMessageWithMode } from "@/lib/telegram/telegram-bot.client";
import { buildCognitiveTransactionKeyboard } from "@/lib/telegram/telegram-inline-actions";
import { formatCognitiveCardText, resolveCategoryName } from "@/lib/telegram/cognitive-card";
import { uploadReceipt } from "@/lib/supabase-storage";
import { bufferToBase64 } from "@/lib/inbox/parse-inbox-post";
import { looksLikeExpenseEntry } from "@/lib/telegram/vorcaro-telegram-commands";
import { detectIncomeVerb } from "@/lib/telegram/detect-income-hint";
import { VorcaroConversationService } from "@/modules/vorcaro/conversation/application/services/vorcaro-conversation.service";
import { randomUUID } from "crypto";

function createProcessInboxItemUseCase(): ProcessInboxItemUseCase {
  const inboxRepository = new PrismaInboxRepository(prisma);
  const extractionResultRepository = new PrismaExtractionResultRepository(prisma);
  const aiService = new GeminiAiService();
  const accountRepository = new PrismaFinancialAccountRepository(prisma);
  const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
  const cardRepository = new PrismaCardRepository(prisma);
  const instrumentLookup = new PrismaInstrumentLookupService(
    accountRepository,
    paymentMethodRepository,
    cardRepository,
  );

  const enrichExtractionUseCase = new EnrichExtractionUseCase(
    new PrismaUserRuleRepository(prisma),
    new PrismaUserLearningPatternRepository(prisma),
    instrumentLookup,
    new PrismaCategoryConfigRepository(prisma),
  );

  return new ProcessInboxItemUseCase(
    inboxRepository,
    aiService,
    extractionResultRepository,
    enrichExtractionUseCase,
  );
}

/**
 * Processa um item da Caixa Financeira (IA, classificação, efetivação/confirmação).
 *
 * Extraído do worker BullMQ para poder ser chamado diretamente (sem fila) em
 * ambientes serverless como a Vercel, onde não há processo persistente para
 * consumir a fila — sem isso, itens ficavam presos em PENDING para sempre.
 */
export async function processFinancialInboxItem(inboxItemId: string, userId: string): Promise<void> {
  const inboxRepository = new PrismaInboxRepository(prisma);

  const item = await inboxRepository.findById(inboxItemId);
  if (!item) {
    throw new Error(`Inbox item not found: ${inboxItemId}`);
  }

  if (item.userId !== userId) {
    throw new Error(`Unauthorized job for inbox item: ${inboxItemId}`);
  }

  await inboxRepository.updateStatus(inboxItemId, "PROCESSING");

  try {
    let meta = (item.channelMeta as Record<string, any>) || {};

    if (item.channel.startsWith("TELEGRAM") && meta.telegramFileId && !meta.imageBase64 && !meta.audioBase64) {
      const { buffer, mimeType } = await downloadTelegramFile(meta.telegramFileId, meta.mimeType);
      const base64 = bufferToBase64(buffer);

      if (item.channel === "TELEGRAM_IMAGE") {
        meta.imageBase64 = base64;
      } else if (item.channel === "TELEGRAM_VOICE") {
        meta.audioBase64 = base64;
      }
      meta.mimeType = mimeType;

      const ext = mimeType.includes("image") ? "jpg" : "ogg";
      try {
        const mediaUrl = await uploadReceipt(buffer, mimeType, `${userId}/${randomUUID()}.${ext}`);
        meta.mediaUrl = mediaUrl;
      } catch (e) {
        console.error("[financial-inbox] Supabase upload failed:", e);
      }

      await prisma.financialInbox.update({
        where: { id: inboxItemId },
        data: { channelMeta: meta },
      });
    }

    // Transcrição da voz reaproveitada adiante (ex.: detecção de receita).
    let voiceTranscription: string | null = null;

    // Áudio que não parece uma despesa (ex.: "Vorcaro, como estou indo?") vira uma
    // pergunta ao assistente em vez de forçar uma extração de lançamento que falharia.
    if (item.channel === "TELEGRAM_VOICE" && meta.audioBase64) {
      const aiService = new GeminiAiService();
      voiceTranscription = await aiService
        .transcribeAudio({ type: "audio", mimeType: meta.mimeType, base64: meta.audioBase64 })
        .catch(() => null);

      if (voiceTranscription && !looksLikeExpenseEntry(voiceTranscription)) {
        const chatId = meta.chatId;
        try {
          const chatService = new VorcaroConversationService(prisma);
          const chatResult = await chatService.sendMessage({ userId, message: voiceTranscription, channel: "TELEGRAM" });
          if (chatId) {
            await sendTelegramMessageWithMode(chatId, chatResult.answer.slice(0, 3900), "HTML");
          }
        } catch (error) {
          console.error("[financial-inbox] voice conversational fallback failed:", error);
          if (chatId) {
            await sendTelegramMessageWithMode(
              chatId,
              "Não consegui entender o áudio. Tente novamente ou digite sua mensagem.",
              "HTML",
            );
          }
        }
        // Não é um lançamento — remove o item para não poluir a Caixa Financeira
        // (mesmo comportamento do texto casual, que nunca chega a criar um item).
        await prisma.financialInbox.delete({ where: { id: inboxItemId } }).catch(() => undefined);
        return;
      }
    }

    const useCase = createProcessInboxItemUseCase();
    const result = await useCase.execute({ inboxItemId, userId });

    // Sprint 16.2/16.3 — verbos de entrada ("recebi", "ganhei", "depósito") forçam
    // classificação como RECEITA. Em voz, usa a transcrição real (rawContent é o
    // placeholder "[Audio Message]"), com fallback para rawContent no texto.
    const incomeSourceText = voiceTranscription ?? item.rawContent;
    if (result.extraction.type !== "INCOME" && detectIncomeVerb(incomeSourceText)) {
      result.extraction.type = "INCOME";
      // valor de receita é sempre positivo
      if (typeof result.extraction.amount === "number") {
        result.extraction.amount = Math.abs(result.extraction.amount);
      }
    }

    const classifier = new InboxClassificationService(prisma);
    const suggestion = await classifier.classify({
      userId,
      description: result.extraction.description ?? item.rawContent,
      rawContent: item.rawContent,
      descricaoBase: result.extraction.descricaoBase,
      category: result.extraction.category,
      paymentMethod: result.extraction.paymentMethod,
    });
    const merged = mergeClassificationIntoExtraction(result.extraction, suggestion);
    const extractionRepo = new PrismaExtractionResultRepository(prisma);
    await extractionRepo.updateExtractedData(result.extractionResultId, merged);

    const tier = resolveAutomationTier(suggestion.confidence, Boolean(suggestion.categoryId));

    if (tier === "auto") {
      await handleInboxSmartBatchExecute(prisma, userId, [inboxItemId], { recordFeedback: false });
      console.info(`[financial-inbox] Item ${inboxItemId} → AUTO_EFFECTUATED (confidence: ${suggestion.confidence})`);
    } else {
      await inboxRepository.updateStatus(inboxItemId, "NEEDS_CONFIRMATION");
      console.info(
        `[financial-inbox] Item ${inboxItemId} → NEEDS_CONFIRMATION (extraction: ${result.extractionResultId}, confidence: ${suggestion.confidence})`,
      );
    }

    if (item.channel.startsWith("TELEGRAM")) {
      const chatId = (item.channelMeta as any)?.chatId;
      if (chatId) {
        const categoryName = await resolveCategoryName(prisma, userId, result.extraction.categoryId);
        await sendTelegramMessageWithMode(
          chatId,
          formatCognitiveCardText(result.extraction, categoryName),
          "HTML",
          { inline_keyboard: buildCognitiveTransactionKeyboard(inboxItemId) },
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";

    await inboxRepository.updateStatus(inboxItemId, "ERROR", message).catch(() => {
      console.error(`[financial-inbox] Failed to persist ERROR status for ${inboxItemId}`);
    });

    console.error(`[financial-inbox] Item ${inboxItemId} → ERROR: ${message}`);
    throw error;
  }
}
