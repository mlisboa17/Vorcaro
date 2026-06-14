/**
 * Valida o header enviado pelo Telegram quando secret_token foi definido no setWebhook.
 * @see https://core.telegram.org/bots/api#setwebhook
 */
export function validateTelegramWebhookSecret(request: Request): boolean {
  let configured = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!configured) {
    return true;
  }

  if (
    (configured.startsWith('"') && configured.endsWith('"')) ||
    (configured.startsWith("'") && configured.endsWith("'"))
  ) {
    configured = configured.slice(1, -1);
  }

  const header = request.headers.get("x-telegram-bot-api-secret-token");
  return header === configured;
}

export function isTelegramBotConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}
