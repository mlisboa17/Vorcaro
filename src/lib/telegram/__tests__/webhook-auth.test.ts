import { afterEach, describe, expect, it } from "vitest";
import { validateTelegramWebhookSecret } from "../webhook-auth";

describe("validateTelegramWebhookSecret", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    } else {
      process.env.TELEGRAM_WEBHOOK_SECRET = original;
    }
  });

  it("permite quando secret não está configurado", () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const request = new Request("http://localhost/api/telegram/webhook", { method: "POST" });
    expect(validateTelegramWebhookSecret(request)).toBe(true);
  });

  it("valida header quando secret configurado", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret-value";
    const ok = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "test-secret-value" },
    });
    const bad = new Request("http://localhost/api/telegram/webhook", { method: "POST" });
    expect(validateTelegramWebhookSecret(ok)).toBe(true);
    expect(validateTelegramWebhookSecret(bad)).toBe(false);
  });
});
