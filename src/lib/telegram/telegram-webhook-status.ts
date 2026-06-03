const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface TelegramWebhookDisplayStatus {
  botUsername: string | null;
  publicWebhookUrl: string | null;
  active: boolean;
  pendingUpdateCount: number | null;
  lastErrorMessage: string | null;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
}

interface TelegramWebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string | null;
}

interface TelegramBotUser {
  username?: string;
}

/** URLs locais não são válidas como webhook do Telegram. */
export function isLocalAppUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return true;
  }
}

export function resolveInternalAppUrl(request: Request): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    new URL(request.url).origin;
  return base.replace(/\/$/, "");
}

export function parseTelegramWebhookInfo(
  info: TelegramWebhookInfo | undefined,
): Pick<TelegramWebhookDisplayStatus, "publicWebhookUrl" | "active" | "pendingUpdateCount" | "lastErrorMessage"> {
  const rawUrl = info?.url?.trim() ?? "";
  const hasPublicUrl = rawUrl.length > 0 && !isLocalAppUrl(rawUrl);

  return {
    publicWebhookUrl: hasPublicUrl ? rawUrl : null,
    active: hasPublicUrl,
    pendingUpdateCount: info?.pending_update_count ?? null,
    lastErrorMessage: info?.last_error_message?.trim() || null,
  };
}

export async function fetchTelegramWebhookDisplayStatus(): Promise<TelegramWebhookDisplayStatus | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;

  try {
    const [infoResponse, meResponse] = await Promise.all([
      fetch(`${TELEGRAM_API_BASE}/bot${token}/getWebhookInfo`, { cache: "no-store" }),
      fetch(`${TELEGRAM_API_BASE}/bot${token}/getMe`, { cache: "no-store" }),
    ]);

    const infoData = (await infoResponse.json()) as TelegramApiResponse<TelegramWebhookInfo>;
    const meData = (await meResponse.json()) as TelegramApiResponse<TelegramBotUser>;

    const username = meData.result?.username;
    const parsed = parseTelegramWebhookInfo(infoData.result);

    return {
      botUsername: username ? `@${username}` : null,
      ...parsed,
    };
  } catch {
    return null;
  }
}
