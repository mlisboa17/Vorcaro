import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CONNECT_CODE_TTL_MS, generateConnectCode } from "@/lib/telegram/generate-connect-code";
import { isTelegramBotConfigured } from "@/lib/telegram/webhook-auth";
import {
  fetchTelegramWebhookDisplayStatus,
  resolveInternalAppUrl,
} from "@/lib/telegram/telegram-webhook-status";
import { prisma } from "@/lib/prisma";
import { PrismaTelegramIntegrationRepository } from "@/modules/telegram/infrastructure/prisma-telegram-integration.repository";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = new PrismaTelegramIntegrationRepository(prisma);
  const connection = await repo.findActiveConnectionByUserId(session.user.id);
  const telegramWebhook = await fetchTelegramWebhookDisplayStatus();

  return NextResponse.json({
    botConfigured: isTelegramBotConfigured(),
    internalAppUrl: resolveInternalAppUrl(request),
    webhookSecretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
    telegramWebhook,
    connection: connection
      ? {
          id: connection.id,
          username: connection.username,
          firstName: connection.firstName,
          telegramChatId: connection.telegramChatId.toString(),
          connectedAt: connection.connectedAt.toISOString(),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramBotConfigured()) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 503 });
  }

  const code = generateConnectCode();
  const expiresAt = new Date(Date.now() + CONNECT_CODE_TTL_MS);
  const repo = new PrismaTelegramIntegrationRepository(prisma);
  await repo.createConnectCode(session.user.id, code, expiresAt);

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    command: `/connect ${code}`,
    ttlMinutes: CONNECT_CODE_TTL_MS / 60_000,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = new PrismaTelegramIntegrationRepository(prisma);
  await repo.disconnect(session.user.id);

  return NextResponse.json({ ok: true });
}
