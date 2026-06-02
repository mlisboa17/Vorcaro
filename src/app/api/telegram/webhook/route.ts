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
  if (!update?.message) {
    return NextResponse.json({ ok: true, skipped: "no_message" });
  }

  try {
    const service = new ProcessTelegramUpdateService(
      prisma,
      new PrismaTelegramIntegrationRepository(prisma),
    );
    const result = await service.execute(update.message);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram webhook failed";
    console.error("[telegram/webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleTelegramWebhook(request);
}
