import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProcessBankWebhookUseCase } from "@/modules/transactions/use-cases/process-bank-webhook.use-case";
import { WebhookParserFactory } from "@/modules/integrations/parsers/webhook-parser.factory";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const queryProvider = url.searchParams.get("provider");
    const body = await req.json();

    // Ler parâmetro do provedor da query string ou default para asaas se nulo
    const provider = queryProvider || "asaas";

    // Tentar obter o webhookToken (pode vir da query ou do body)
    let token = queryToken;
    if (!token && body && typeof body === "object" && "webhookToken" in body) {
      token = String(body.webhookToken);
    }

    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 400 });
    }

    // 1. Buscar integração ativa via webhookToken (para isolamento Multitenant)
    const financialAccount = await prisma.financialAccount.findUnique({
      where: { webhookToken: token },
      select: { id: true, userId: true, webhookToken: true },
    });

    if (!financialAccount || !financialAccount.webhookToken) {
      return NextResponse.json({ error: "Integração não encontrada ou inativa" }, { status: 401 });
    }

    // 2. Extrair headers e delegar validação de assinatura de segurança ao parser
    const headers = Object.fromEntries(req.headers.entries());
    const parser = WebhookParserFactory.getParser(provider);
    // 3. Extrair possível eventId (Safe cast, sem any) para logging
    let eventId: string | null = null;
    if (body && typeof body === "object" && "payment" in body) {
      const safeBody = body as { payment?: { id?: string } };
      eventId = safeBody.payment?.id ? String(safeBody.payment.id) : null;
    }

    if (!parser.validateSignature(headers, financialAccount.webhookToken)) {
      await prisma.webhookLog.create({
        data: { tenantId: financialAccount.userId, provider, eventId, status: "ERROR", errorMessage: "Assinatura do webhook inválida ou ausente (Unauthorized)" }
      });
      return NextResponse.json({ error: "Assinatura do webhook inválida ou ausente (Unauthorized)" }, { status: 401 });
    }

    // 4. Processamento Idempotente via Caso de Uso (A validação estrutural do payload já está delegada à factory)
    const useCase = new ProcessBankWebhookUseCase();
    const result = await useCase.execute(financialAccount.userId, financialAccount.id, provider, body);

    if (result.ignored) {
      await prisma.webhookLog.create({
        data: { tenantId: financialAccount.userId, provider, eventId, status: "IGNORED" }
      });
      // Evento duplicado retido com sucesso pela idempotência
      return NextResponse.json({ status: "ignored", message: "Evento duplicado já processado." }, { status: 200 });
    }

    await prisma.webhookLog.create({
      data: { tenantId: financialAccount.userId, provider, eventId, status: "SUCCESS" }
    });

    return NextResponse.json({ status: "processed", transactionId: result.transactionId }, { status: 200 });
  } catch (error) {
    console.error("[BankWebhook] Erro não tratado:", error);
    
    // Tentativa de log de erro se houver contexto mínimo
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const provider = url.searchParams.get("provider") || "asaas";
    const errorMessage = error instanceof Error ? error.message : "Erro interno no servidor";
    
    if (queryToken) {
      const acc = await prisma.financialAccount.findUnique({ where: { webhookToken: queryToken }, select: { userId: true } });
      if (acc) {
        await prisma.webhookLog.create({
          data: { tenantId: acc.userId, provider, status: "ERROR", errorMessage }
        });
      }
    }

    // Tratamento específico de erro de validação (ZodError) ou provedor não suportado
    if (error instanceof Error && (error.name === "ZodError" || error.name === "UnsupportedProviderError")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
