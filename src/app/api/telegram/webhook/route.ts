import { NextResponse, after } from "next/server";
import { handleTelegramWebhook } from "@/lib/telegram/handle-telegram-webhook";
import { isTelegramBotConfigured, validateTelegramWebhookSecret } from "@/lib/telegram/webhook-auth";

export async function POST(request: Request) {
  try {
    // 1. Validar se o bot está configurado e se o token do webhook é válido
    if (!isTelegramBotConfigured()) {
      return NextResponse.json({ error: "Telegram bot not configured" }, { status: 503 });
    }

    if (!validateTelegramWebhookSecret(request)) {
      console.warn("[Telegram Webhook] Requisição não autorizada recebida.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ler o corpo JSON da requisição original e logar
    const body = await request.json();
    console.log("[Telegram Webhook Payload Received]:", JSON.stringify(body, null, 2));

    // 3. Criar uma nova Request contendo o payload lido para execução assíncrona segura
    const mockRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body),
    });

    // 4. Disparar o processamento em segundo plano sem aguardar o retorno (evita timeout no Telegram).
    // `after()` garante que a função serverless permaneça viva até esse trabalho terminar —
    // sem isso, a Vercel pode congelar/encerrar a execução assim que a resposta é enviada,
    // matando o processamento antes de completar (ex: vínculo de conta falhando silenciosamente).
    after(() =>
      handleTelegramWebhook(mockRequest).catch((err) => {
        console.error("[Telegram Webhook Async Processing Error]:", err);
      }),
    );

    // 5. Retornar status 200 OK imediatamente para liberar a fila do Telegram
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Telegram Webhook Error]:", error);
    // Retorna 200 mesmo em caso de erro interno para evitar que o Telegram fique reenviando o mesmo payload
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 200 });
  }
}
