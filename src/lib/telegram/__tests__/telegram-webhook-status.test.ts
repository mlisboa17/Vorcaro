import { describe, expect, it } from "vitest";
import { isLocalAppUrl, parseTelegramWebhookInfo } from "../telegram-webhook-status";

describe("isLocalAppUrl", () => {
  it("detecta localhost e loopback", () => {
    expect(isLocalAppUrl("http://localhost:3000/api/telegram/webhook")).toBe(true);
    expect(isLocalAppUrl("http://127.0.0.1:3000/api/telegram/webhook")).toBe(true);
    expect(isLocalAppUrl("https://tunnel.ngrok-free.dev/api/telegram/webhook")).toBe(false);
  });
});

describe("parseTelegramWebhookInfo", () => {
  it("ignora webhook localhost e marca inativo", () => {
    const parsed = parseTelegramWebhookInfo({
      url: "http://localhost:3000/api/telegram/webhook",
      pending_update_count: 2,
      last_error_message: "bad gateway",
    });

    expect(parsed.publicWebhookUrl).toBeNull();
    expect(parsed.active).toBe(false);
    expect(parsed.pendingUpdateCount).toBe(2);
    expect(parsed.lastErrorMessage).toBe("bad gateway");
  });

  it("expõe URL pública registrada no Telegram", () => {
    const parsed = parseTelegramWebhookInfo({
      url: "https://abc.ngrok-free.dev/api/telegram/webhook",
      pending_update_count: 0,
      last_error_message: null,
    });

    expect(parsed.publicWebhookUrl).toBe("https://abc.ngrok-free.dev/api/telegram/webhook");
    expect(parsed.active).toBe(true);
    expect(parsed.pendingUpdateCount).toBe(0);
    expect(parsed.lastErrorMessage).toBeNull();
  });

  it("trata webhook vazio como não registrado", () => {
    const parsed = parseTelegramWebhookInfo({ url: "", pending_update_count: 0 });

    expect(parsed.publicWebhookUrl).toBeNull();
    expect(parsed.active).toBe(false);
  });
});
