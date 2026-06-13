import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProcessBankWebhookUseCase } from "@/modules/financial-inbox/application/use-cases/process-bank-webhook.use-case";

export async function POST(req: NextRequest) {
  try {
    // 1. Obter a chave de idempotência (geralmente enviada no header ou um hash do ID do evento)
    const idempotencyKey = req.headers.get("x-idempotency-key");
    const methodPath = `${req.method} ${req.nextUrl.pathname}`;

    if (!idempotencyKey) {
      return NextResponse.json({ error: "x-idempotency-key header is required" }, { status: 400 });
    }

    // 2. Verificar se a chave já foi processada recentemente
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey }
    });

    if (existingKey) {
      console.log(`[Webhook] Idempotency hit for key ${idempotencyKey}. Returning previous response.`);
      return NextResponse.json(existingKey.responseBody, { status: existingKey.responseStatus });
    }

    // 3. Processar o Webhook Payload
    const payload = await req.json();

    // No MVP genérico, esperamos uma estrutura simples. Numa integração real (StarkBank, Asaas),
    // você faria o parse específico e validaria a assinatura digital do Webhook (Hmac).
    const { userId, accountId, transactionId, amount, description, date, type } = payload;

    if (!userId || !accountId || !transactionId || !amount || !description || !date || !type) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const useCase = new ProcessBankWebhookUseCase();
    const result = await useCase.execute({
      userId,
      accountId,
      transactionId,
      amount: Number(amount),
      description,
      date: new Date(date),
      type,
    });

    const responseBody = {
      success: true,
      message: "Webhook processed successfully",
      transactionId: result.transactionId,
    };
    const responseStatus = 200;

    // 4. Salvar a chave de idempotência
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        methodPath,
        responseStatus,
        responseBody: responseBody as any,
      }
    });

    return NextResponse.json(responseBody, { status: responseStatus });

  } catch (error: any) {
    console.error("[BANK_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
