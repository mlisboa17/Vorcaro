/**
 * @deprecated Use POST /api/telegram/webhook (validação via TELEGRAM_WEBHOOK_SECRET).
 * Mantido para compatibilidade com URLs antigas (?token=).
 */
import { NextResponse } from "next/server";
import { handleTelegramWebhook } from "@/app/api/telegram/webhook/route";

function validateLegacyToken(request: Request): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;
  const token = new URL(request.url).searchParams.get("token");
  return token === botToken;
}

export async function POST(request: Request) {
  if (!validateLegacyToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const headers = new Headers(request.headers);
  if (secret) {
    headers.set("x-telegram-bot-api-secret-token", secret);
  }

  const body = await request.text();
  const forwarded = new Request(request.url, {
    method: "POST",
    headers,
    body,
  });

  return handleTelegramWebhook(forwarded);
}
