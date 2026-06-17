import { NextResponse } from "next/server";
import { parseTelegramUpdate } from "@/adapters/telegram/types/telegram-update";
import { isTelegramBotConfigured, validateTelegramWebhookSecret } from "@/lib/telegram/webhook-auth";
import { prisma } from "@/lib/prisma";
import { ProcessTelegramUpdateService } from "@/modules/telegram/application/process-telegram-update.service";
import { PrismaTelegramIntegrationRepository } from "@/modules/telegram/infrastructure/prisma-telegram-integration.repository";

export async function handleTelegramWebhook(request: Request) {
  if (!isTelegramBotConfigured()) {
    return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
  }

  if (!validateTelegramWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update = parseTelegramUpdate(body);
  if (!update) {
    return NextResponse.json({ ok: true, skipped: "invalid_update" });
  }

  try {
    const service = new ProcessTelegramUpdateService(
      prisma,
      new PrismaTelegramIntegrationRepository(prisma),
    );

    if (update.callback_query) {
      const result = await service.executeCallback(update.callback_query);
      return NextResponse.json(result);
    }

    if (!update.message) {
      return NextResponse.json({ ok: true, skipped: "no_message" });
    }

    const result = await service.execute(update.message);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Telegram webhook failed";
    
    if (message.includes("Supabase") || message.includes("Storage") || message.includes("Bucket") || message.includes("storage")) {
      console.error("[Telegram Webhook Error] Falha de Storage:", message);
      return NextResponse.json({ success: false, error: 'storage_missing_handled' }, { status: 200 });
    }

    console.error("[telegram/webhook]", message);
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
