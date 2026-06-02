import type { PrismaClient } from "@prisma/client";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";
import type { TransactionRepositoryPort } from "../../domain/ports/transaction-repository.port";
import { BulkDeleteTransactionsError } from "../errors/bulk-update-transactions.error";
import {
  ReverseTransactionError,
  ReverseTransactionUseCase,
} from "./reverse-transaction.use-case";

export interface BulkDeleteTransactionsCommand {
  userId: string;
  transactionIds: string[];
}

export interface BulkDeleteTransactionsResult {
  deletedCount: number;
}

export class BulkDeleteTransactionsUseCase {
  private readonly reverseTransaction: ReverseTransactionUseCase;

  constructor(
    transactionRepository: TransactionRepositoryPort,
    db: PrismaClient,
    liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {
    this.reverseTransaction = new ReverseTransactionUseCase(
      transactionRepository,
      db,
      liabilityRepository,
    );
  }

  async execute(input: BulkDeleteTransactionsCommand): Promise<BulkDeleteTransactionsResult> {
    const uniqueIds = [...new Set(input.transactionIds)];

    if (uniqueIds.length === 0) {
      throw new BulkDeleteTransactionsError("Informe ao menos um lançamento", "VALIDATION");
    }

    if (uniqueIds.length > 500) {
      throw new BulkDeleteTransactionsError(
        "O limite é de 500 lançamentos por operação",
        "VALIDATION",
      );
    }

    let deletedCount = 0;

    for (const transactionId of uniqueIds) {
      try {
        await this.reverseTransaction.execute({
          transactionId,
          userId: input.userId,
        });
        deletedCount += 1;
      } catch (error) {
        if (error instanceof ReverseTransactionError) {
          throw new BulkDeleteTransactionsError(error.message, "NOT_FOUND");
        }

        throw error;
      }
    }

    return { deletedCount };
  }
}
