import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const NGROK_PATHS = [
  "C:\\Users\\mlisb\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\\ngrok.exe",
  "ngrok",
];

function findNgrok(): string {
  const { execSync } = require("child_process") as typeof import("child_process");
  for (const path of NGROK_PATHS) {
    try {
      execSync(`"${path}" version`, { stdio: "ignore" });
      return path;
    } catch {
      // try next
    }
  }
  throw new Error("ngrok não encontrado. Instale via: winget install ngrok.ngrok");
}

async function getNgrokUrl(): Promise<string> {
  // Aguarda até 15s pelo túnel ficar ativo
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch("http://localhost:4040/api/tunnels");
      const data = (await res.json()) as { tunnels: { public_url: string }[] };
      const tunnel = data.tunnels.find((t) => t.public_url.startsWith("https://"));
      if (tunnel) return tunnel.public_url;
    } catch {
      // ainda não está pronto
    }
  }
  throw new Error("Timeout aguardando ngrok iniciar.");
}

async function registerWebhook(publicUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");

  const webhookUrl = `${publicUrl}/api/telegram/webhook`;
  console.log(`📡 Registrando webhook: ${webhookUrl}`);

  const body: Record<string, string> = { url: webhookUrl };
  if (secret) body.secret_token = secret;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(data.description ?? "Falha ao registrar webhook.");
  console.log("✅ Webhook registrado com sucesso!");
}

async function main() {
  console.log("🚀 Iniciando Orquestrador Local...");

  const ngrok = findNgrok();
  console.log(`🔗 Usando ngrok: ${ngrok}`);

  const proc = spawn(ngrok, ["http", "3000"], {
    stdio: "inherit",
    detached: false,
  });

  proc.on("error", (err) => {
    console.error("❌ Erro ao iniciar ngrok:", err.message);
    process.exit(1);
  });

  try {
    const publicUrl = await getNgrokUrl();
    console.log(`\n✅ Ngrok Tunnel Ativo!\nURL Pública: ${publicUrl}\n`);
    await registerWebhook(publicUrl);
    console.log("\nOrquestrador rodando. (Ctrl+C para encerrar).");
  } catch (err) {
    console.error("❌", err instanceof Error ? err.message : err);
    proc.kill();
    process.exit(1);
  }

  process.on("SIGINT", () => {
    console.log("\n🛑 Encerrando ngrok...");
    proc.kill();
    process.exit(0);
  });
}

main();
