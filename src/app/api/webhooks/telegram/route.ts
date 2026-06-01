import { NextResponse } from "next/server";

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

  parseTelegramUpdate,

} from "@/adapters/telegram/types/telegram-update";

import { bufferToBase64 } from "@/lib/inbox/parse-inbox-post";

import { prisma } from "@/lib/prisma";

import { enqueueFinancialInboxProcessing } from "@/lib/queue";

import { downloadTelegramFile } from "@/lib/telegram/telegram-bot.client";

import { IngestInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/ingest-inbox-item.use-case";

import { GeminiAiService } from "@/modules/financial-inbox/infrastructure/services/gemini-ai.service";

import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";



const DEV_USER_EMAIL = "dev@logos.local";



function validateWebhookToken(request: Request): boolean {

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {

    return false;

  }



  const { searchParams } = new URL(request.url);

  const token = searchParams.get("token");



  return token === botToken;

}



async function resolveDevUserId(): Promise<string | null> {

  const user = await prisma.user.findUnique({

    where: { email: DEV_USER_EMAIL },

    select: { id: true },

  });



  return user?.id ?? null;

}



function logWelcome(chatId: number, username?: string): void {

  const displayName = username ? `@${username}` : `chat ${chatId}`;

  console.info(

    `[telegram] Boas-vindas para ${displayName} — Logos Financeiro pronto. Envie texto, áudio ou foto de comprovante.`,

  );

}



async function ingestAndEnqueue(

  ingestInput: ReturnType<typeof toTelegramTextIngestInput>,

  userId: string,

) {

  const repository = new PrismaInboxRepository(prisma);

  const useCase = new IngestInboxItemUseCase(repository);

  const { id } = await useCase.execute(ingestInput);



  await enqueueFinancialInboxProcessing({

    inboxItemId: id,

    userId,

  });



  return id;

}



export async function POST(request: Request) {

  if (!validateWebhookToken(request)) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  let body: unknown;

  try {

    body = await request.json();

  } catch {

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  }



  const update = parseTelegramUpdate(body);

  if (!update?.message) {

    return NextResponse.json({ ok: true, skipped: "no_message" });

  }



  const message = update.message;

  const chatId = message.chat.id;

  const username = message.from?.username;



  if (message.text && (isStartCommand(message.text) || isHelpCommand(message.text))) {

    logWelcome(chatId, username);

    return NextResponse.json({ ok: true, handled: "command", command: message.text.split(" ")[0] });

  }



  const userId = await resolveDevUserId();

  if (!userId) {

    console.error(`[telegram] Usuário dev não encontrado: ${DEV_USER_EMAIL}`);

    return NextResponse.json({ error: "Dev user not found" }, { status: 500 });

  }



  try {

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



      const id = await ingestAndEnqueue(ingestInput, userId);



      console.info(

        `[telegram] Voz ${id} enfileirada — chat ${chatId}: "${transcription.slice(0, 60)}"`,

      );



      return NextResponse.json({

        ok: true,

        inboxItemId: id,

        status: "PENDING",

        channel: "TELEGRAM_VOICE",

      });

    }



    if (hasPhoto(message)) {

      const fileId = getLargestPhotoFileId(message);

      if (!fileId) {

        return NextResponse.json({ ok: true, skipped: "photo_without_file_id" });

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



      const id = await ingestAndEnqueue(ingestInput, userId);



      console.info(`[telegram] Imagem ${id} enfileirada — chat ${chatId}`);



      return NextResponse.json({

        ok: true,

        inboxItemId: id,

        status: "PENDING",

        channel: "TELEGRAM_IMAGE",

      });

    }



    const text = message.text?.trim();

    if (!text) {

      return NextResponse.json({ ok: true, skipped: "empty_text" });

    }



    const ingestInput = toTelegramTextIngestInput(userId, {

      rawContent: text,

      chatId,

      messageId: message.message_id,

      username,

    });



    const id = await ingestAndEnqueue(ingestInput, userId);



    console.info(`[telegram] Item ${id} enfileirado — chat ${chatId}: "${text.slice(0, 60)}"`);



    return NextResponse.json({ ok: true, inboxItemId: id, status: "PENDING" });

  } catch (error) {

    const messageText = error instanceof Error ? error.message : "Telegram ingest failed";

    console.error("[telegram] Falha na ingestão multimodal:", messageText);

    return NextResponse.json({ error: messageText }, { status: 500 });

  }

}

