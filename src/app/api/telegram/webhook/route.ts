import { handleTelegramWebhook } from "@/lib/telegram/handle-telegram-webhook";

export async function POST(request: Request) {
  return handleTelegramWebhook(request);
}
