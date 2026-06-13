import { getTenantPrisma } from "@/lib/prisma-tenant";
import { CategoryRuleEngine } from "@/modules/automation/services/CategoryRuleEngine";

export type ProcessBankWebhookInput = {
  userId: string;
  accountId: string;
  transactionId: string;
  amount: number;
  description: string;
  date: Date;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
};

export class ProcessBankWebhookUseCase {
  async execute(input: ProcessBankWebhookInput): Promise<{ success: boolean; transactionId: string }> {
    const prisma = getTenantPrisma(input.userId);

    // 1. Aplica o motor de regras para tentar categorizar automaticamente
    const ruleEngine = new CategoryRuleEngine();
    const match = await ruleEngine.execute(input.description, input.userId);

    // 2. Insere a transação usando fitId para garantir unicidade em nível de banco de dados
    const transaction = await prisma.transaction.upsert({
      where: {
        userId_accountId_fitId: {
          userId: input.userId,
          accountId: input.accountId,
          fitId: input.transactionId,
        },
      },
      update: {
        // Se a transação já existe e recebemos outro evento (ex: update de status no webhook), 
        // poderíamos atualizar. Para este MVP, deixamos vazio para não sobrescrever edições manuais do usuário.
      },
      create: {
        userId: input.userId,
        accountId: input.accountId,
        description: input.description,
        amount: input.amount,
        type: input.type,
        date: input.date,
        categoryId: match?.categoryId || undefined,
        ruleId: match?.ruleId || undefined,
        fitId: input.transactionId, // Usamos o ID da transação original do banco como fitId
      },
    });

    return {
      success: true,
      transactionId: transaction.id,
    };
  }
}
