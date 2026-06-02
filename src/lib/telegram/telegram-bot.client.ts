const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined");
  }
  return token;
}

interface TelegramFileResponse {
  ok: boolean;
  result?: {
    file_id: string;
    file_path?: string;
    file_size?: number;
  };
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: HTTP ${response.status}`);
  }
}

export async function downloadTelegramFile(
  fileId: string,
  fallbackMimeType = "application/octet-stream",
): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = getBotToken();

  const fileMetaResponse = await fetch(
    `${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );

  if (!fileMetaResponse.ok) {
    throw new Error(`Telegram getFile failed: HTTP ${fileMetaResponse.status}`);
  }

  const fileMeta = (await fileMetaResponse.json()) as TelegramFileResponse;

  if (!fileMeta.ok || !fileMeta.result?.file_path) {
    throw new Error("Telegram getFile returned no file_path");
  }

  const filePath = fileMeta.result.file_path;
  const downloadResponse = await fetch(`${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`);

  if (!downloadResponse.ok) {
    throw new Error(`Telegram file download failed: HTTP ${downloadResponse.status}`);
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = inferMimeTypeFromPath(filePath, fallbackMimeType);

  return { buffer, mimeType };
}

function inferMimeTypeFromPath(filePath: string, fallback: string): string {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  if (lower.endsWith(".ogg")) {
    return "audio/ogg";
  }

  if (lower.endsWith(".mp3")) {
    return "audio/mpeg";
  }

  return fallback;
}
