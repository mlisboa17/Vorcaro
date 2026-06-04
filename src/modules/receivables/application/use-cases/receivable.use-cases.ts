import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { withReceivableTransactionMetadata } from "@/lib/financial/receivable-transaction-metadata";
import { ReceivableError } from "../../domain/errors/receivable.error";
import type {
  CollectReceivableInput,
  CreateReceivableInput,
  ReceivableRecord,
  ReceivableRepositoryPort,
} from "../../domain/ports/receivable.port";
import { ReceivableService, toDecimal } from "../../domain/services/receivable.service";

export class CreateReceivableUseCase {
  constructor(private readonly repository: ReceivableRepositoryPort) {}

  execute(input: CreateReceivableInput): Promise<ReceivableRecord> {
    if (!input.descricao.trim()) {
      throw new ReceivableError("Descrição é obrigatória.", "VALIDATION");
    }
    if (!input.devedorNome.trim()) {
      throw new ReceivableError("Nome do devedor é obrigatório.", "VALIDATION");
    }
    return this.repository.create(input);
  }
}

export class ListReceivablesUseCase {
  constructor(private readonly repository: ReceivableRepositoryPort) {}

  execute(userId: string, includeCancelled = false) {
    return this.repository.listByUserId(userId, { includeCancelled });
  }
}

export class GetReceivableSummaryUseCase {
  constructor(private readonly repository: ReceivableRepositoryPort) {}

  execute(userId: string) {
    return this.repository.getSummary(userId);
  }
}

export class CreateReceivableFromTransactionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: ReceivableRepositoryPort,
  ) {}

  async execute(input: {
    userId: string;
    transactionId: string;
    devedorNome: string;
    expectedDate?: Date | null;
    observacoes?: string | null;
  }): Promise<ReceivableRecord> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: input.transactionId, userId: input.userId },
    });

    if (!transaction) {
      throw new ReceivableError("Transação não encontrada.", "NOT_FOUND");
    }

    const existing = await this.prisma.receivable.findFirst({
      where: { transactionId: input.transactionId, userId: input.userId },
    });
    if (existing) {
      throw new ReceivableError("Esta transação já possui conta a receber.", "BUSINESS_RULE");
    }

    const receivable = await this.repository.create({
      userId: input.userId,
      descricao: transaction.description,
      devedorNome: input.devedorNome,
      valorOriginal: transaction.amount.toNumber(),
      origem: "TRANSACTION",
      observacoes: input.observacoes ?? null,
      expectedDate: input.expectedDate ?? null,
      transactionId: transaction.id,
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: withReceivableTransactionMetadata(transaction.metadata, receivable.id) as Prisma.InputJsonValue,
      },
    });

    return receivable;
  }
}

export class CollectReceivableUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: ReceivableRepositoryPort,
  ) {}

  async execute(input: CollectReceivableInput): Promise<{
    receivable: ReceivableRecord;
    transactionId: string;
  }> {
    const receivable = await this.repository.findByIdForUser(input.receivableId, input.userId);
    if (!receivable) {
      throw new ReceivableError("Conta a receber não encontrada.", "NOT_FOUND");
    }

    if (receivable.status === "CANCELLED" || receivable.status === "RECEIVED") {
      throw new ReceivableError("Conta a receber não está aberta para recebimento.", "BUSINESS_RULE");
    }

    const account = await this.prisma.financialAccount.findFirst({
      where: { id: input.accountId, userId: input.userId, isActive: true },
    });
    if (!account) {
      throw new ReceivableError("Conta financeira não encontrada.", "NOT_FOUND");
    }

    const applied = ReceivableService.applyCollection(
      toDecimal(receivable.valorOriginal),
      toDecimal(receivable.valorRecebido),
      toDecimal(input.amount),
    );

    const description =
      input.description?.trim() ||
      `Recebimento — ${receivable.devedorNome} — ${receivable.descricao}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const income = await tx.transaction.create({
        data: {
          userId: input.userId,
          accountId: account.id,
          type: "INCOME",
          amount: new Decimal(input.amount),
          description,
          date: input.date,
          dataCaixa: input.date,
          metadata: {
            receivableId: receivable.id,
            receivableCollection: true,
          },
        },
      });

      await tx.financialAccount.update({
        where: { id: account.id },
        data: { balance: account.balance.plus(new Decimal(input.amount)) },
      });

      const updated = await tx.receivable.update({
        where: { id: receivable.id },
        data: {
          valorRecebido: applied.valorRecebido,
          valorPendente: applied.valorPendente,
          status: applied.status,
          receivedAt: applied.receivedAt ?? receivable.receivedAt,
        },
      });

      return { receivable: updated, transactionId: income.id };
    });

    const mapped = await this.repository.findByIdForUser(result.receivable.id, input.userId);
    if (!mapped) {
      throw new ReceivableError("Falha ao atualizar conta a receber.", "BUSINESS_RULE");
    }

    if (mapped.status === "RECEIVED") {
      const { getVorcaroEntityStateChangedHandler } = await import("@/lib/api/vorcaro-followups");
      await getVorcaroEntityStateChangedHandler().onEntityStateChanged({
        userId: input.userId,
        entityType: "RECEIVABLE",
        entityId: mapped.id,
        newStatus: "RECEIVED",
      });
    }

    return { receivable: mapped, transactionId: result.transactionId };
  }
}

export class CancelReceivableUseCase {
  constructor(private readonly repository: ReceivableRepositoryPort) {}

  async execute(userId: string, receivableId: string): Promise<ReceivableRecord> {
    const receivable = await this.repository.findByIdForUser(receivableId, userId);
    if (!receivable) {
      throw new ReceivableError("Conta a receber não encontrada.", "NOT_FOUND");
    }

    if (receivable.status === "RECEIVED") {
      throw new ReceivableError("Conta já recebida não pode ser cancelada.", "BUSINESS_RULE");
    }

    const cancelled = ReceivableService.applyCancellation();

    const updated = await this.repository.update(receivableId, userId, {
      status: cancelled.status,
      valorPendente: cancelled.valorPendente.toNumber(),
    });

    if (!updated) {
      throw new ReceivableError("Conta a receber não encontrada.", "NOT_FOUND");
    }

    return updated;
  }
}
