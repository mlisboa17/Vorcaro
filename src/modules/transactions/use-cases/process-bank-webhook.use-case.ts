import { getTenantPrisma } from "@/lib/prisma-tenant";
import { CategoryRuleEngine } from "@/modules/automation/services/CategoryRuleEngine";
import type { BankWebhookPayload } from "../types/bank-webhook.types";
import { Prisma } from "@prisma/client";

export class ProcessBankWebhookUseCase {
  async execute(userId: string, accountId: string, payload: BankWebhookPayload): Promise<{ success: boolean; transactionId?: string; ignored: boolean }> {
    const prisma = getTenantPrisma(userId);

    // 1. Aplica o motor de regras para tentar categorizar automaticamente
    const ruleEngine = new CategoryRuleEngine();
    const match = await ruleEngine.execute(payload.description, userId);

    // 2. Insere a transação interceptando duplicatas para idempotência rigorosa
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
