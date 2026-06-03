#!/usr/bin/env node
/**
 * Registra o webhook do Telegram usando a URL pública do ngrok.
 * Uso: npm run telegram:webhook
 *      npm run telegram:webhook -- https://xxxx.ngrok-free.dev
 */
import {
  fetchNgrokPublicUrl,
  loadEnv,
  maskSecrets,
  printWebhookStatus,
  registerTelegramWebhook,
} from "./lib/dev-env.mjs";

async function main() {
  loadEnv();

  const argUrl = process.argv[2]?.trim();
  let publicUrl = argUrl || null;

  if (!publicUrl) {
    publicUrl = await fetchNgrokPublicUrl();
  }

  if (!publicUrl) {
    console.error(
      [
        "URL pública não encontrada.",
        "",
        "Inicie o ngrok (ngrok http 3000) ou informe a URL:",
        "  npm run telegram:webhook -- https://seu-tunnel.ngrok-free.dev",
      ].join("\n"),
    );
    process.exit(1);
  }

  try {
    const result = await registerTelegramWebhook(publicUrl);
    console.log("\nTelegram webhook registrado.\n");
    printWebhookStatus(result);
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro:", maskSecrets(message));
    process.exit(1);
  }
}

main();
