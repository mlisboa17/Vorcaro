import dotenv from "dotenv";
import ngrok from "ngrok";

dotenv.config();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error("❌ ERRO FATAL: TELEGRAM_BOT_TOKEN não encontrado nas variáveis de ambiente.");
    process.exit(1);
  }

  console.log("🚀 Iniciando Orquestrador Local...");

  try {
    console.log("🔗 Estabelecendo túnel Ngrok na porta 3000...");
    const publicUrl = await ngrok.connect({
      addr: 3000,
      authtoken: process.env.NGROK_AUTHTOKEN, // Optional, can be undefined
    });

    console.log(`\n✅ Ngrok Tunnel Ativo!\nURL Pública: ${publicUrl}\n`);
    
    console.log("⏳ Aguardando 2 segundos para propagação do túnel...");
    await delay(2000);

    const webhookUrl = `${publicUrl}/api/telegram/webhook`;
    console.log(`📡 Registrando Webhook no Telegram...`);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("❌ Falha ao registrar o Webhook do Telegram:");
      console.error(data.description || "Erro desconhecido da API do Telegram.");
      process.exit(1);
    }

    console.log("✅ Webhook registrado com sucesso!");
    console.log(`Resposta Oficial do Telegram: ${JSON.stringify({ ok: data.ok, result: data.result })}`);

    console.log("\nServiço orquestrado rodando de fundo. (Pressione Ctrl+C para encerrar).");

  } catch (error) {
    console.error("❌ Erro inesperado na orquestração:");
    console.error(error instanceof Error ? error.message : "Falha ao iniciar túnel.");
    process.exit(1);
  }
}

main();
