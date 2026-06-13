import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BankWebhookPayload } from "@/modules/transactions/types/bank-webhook.types";
import { ProcessBankWebhookUseCase } from "@/modules/transactions/use-cases/process-bank-webhook.use-case";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const body = (await req.json()) as BankWebhookPayload;

    const token = queryToken || body.webhookToken;

    // 1. Validação estrutural rigorosa sem 'any'
    if (!body.eventId || !token || !body.amount || !body.description || !body.date || !body.type) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    // 2. Buscar integração ativa via webhookToken (para isolamento Multitenant)
    const financialAccount = await prisma.financialAccount.findUnique({
      where: { webhookToken: token },
      select: { id: true, userId: true },
    });

    if (!financialAccount) {
      return NextResponse.json({ error: "Integração não encontrada ou inativa" }, { status: 401 });
    }

    // 3. Processamento Idempotente via Caso de Uso
    // Promessa resolvida assincronamente ou no fluxo principal se for rápido.
    // Como o Prisma não trava o Node e precisamos retornar em < 2s,
    // garantimos a execução rápida.
    const useCase = new ProcessBankWebhookUseCase();
    const result = await useCase.execute(financialAccount.userId, financialAccount.id, body);

    if (result.ignored) {
      // Evento duplicado retido com sucesso pela idempotência
      return NextResponse.json({ status: "ignored", message: "Evento duplicado já processado." }, { status: 200 });
    }

    return NextResponse.json({ status: "processed", transactionId: result.transactionId }, { status: 200 });
  } catch (error) {
    console.error("[BankWebhook] Erro não tratado:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
