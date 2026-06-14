import { getTenantPrisma } from "@/lib/prisma-tenant";
import { CategoryRuleEngine } from "@/modules/automation/services/CategoryRuleEngine";
import { Prisma } from "@prisma/client";
import { WebhookParserFactory } from "../../integrations/parsers/webhook-parser.factory";

export class ProcessBankWebhookUseCase {
  async execute(userId: string, accountId: string, provider: string, rawPayload: unknown): Promise<{ success: boolean; transactionId?: string; ignored: boolean }> {
    const prisma = getTenantPrisma(userId);

    // 1. Resolve o parser e traduz o payload dinamicamente
    const parser = WebhookParserFactory.getParser(provider);
    const payload = parser.parse(rawPayload);

    // 2. Aplica o motor de regras para tentar categorizar automaticamente
    const ruleEngine = new CategoryRuleEngine();
    const match = await ruleEngine.execute(payload.description, userId);

    // 3. Insere a transação interceptando duplicatas para idempotência rigorosa
    try {
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId,
          description: payload.description,
          amount: payload.amount,
          type: payload.type === "CREDIT" ? "INCOME" : "EXPENSE",
          date: new Date(payload.date),
          categoryId: match?.categoryId || undefined,
          ruleId: match?.ruleId || undefined,
          providerEventId: payload.eventId,
        },
      });

      return {
        success: true,
        transactionId: transaction.id,
        ignored: false,
      };
    } catch (error) {
      // Verifica se é violação da chave única (Idempotência disparada)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return {
          success: true, // É sucesso, pois a mensagem já foi processada antes
          ignored: true,
        };
      }
      // Se for outro erro, rebola pra cima
      throw error;
    }
  }
}
