import { TransactionInstrumentValidationError } from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";
import type { BulkTransactionUpdates } from "../../domain/schemas/bulk-update-transactions-api.schema";
import { listBulkAuditFields } from "../../domain/schemas/bulk-update-transactions-api.schema";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "../../domain/ports/ownership-validation.port";
import type { TransactionRepositoryPort } from "../../domain/ports/transaction-repository.port";
import { BulkUpdateTransactionsError } from "../errors/bulk-update-transactions.error";
import { validateBulkTransactionUpdates } from "../validators/validate-bulk-transaction-updates";

export interface BulkUpdateTransactionsCommand {
  userId: string;
  transactionIds: string[];
  updates: BulkTransactionUpdates;
}

export interface BulkUpdateTransactionsResult {
  updatedCount: number;
}

export class BulkUpdateTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
    private readonly liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {}

  async execute(input: BulkUpdateTransactionsCommand): Promise<BulkUpdateTransactionsResult> {
    const uniqueIds = [...new Set(input.transactionIds)];

    if (uniqueIds.length === 0) {
      throw new BulkUpdateTransactionsError("Informe ao menos um lançamento", "VALIDATION");
    }

    if (uniqueIds.length > 500) {
      throw new BulkUpdateTransactionsError(
        "O limite é de 500 lançamentos por operação",
        "VALIDATION",
      );
    }

    const ownedCount = await this.transactionRepository.countByIdsForUser(
      input.userId,
      uniqueIds,
    );

    if (ownedCount !== uniqueIds.length) {
      throw new BulkUpdateTransactionsError(
        "Um ou mais lançamentos não foram encontrados",
        "NOT_FOUND",
      );
    }

    let patch;

    try {
      patch = await validateBulkTransactionUpdates(
        {
          categoryRepository: this.categoryRepository,
          financialAccountRepository: this.financialAccountRepository,
          paymentMethodRepository: this.paymentMethodRepository,
          cardRepository: this.cardRepository,
          liabilityRepository: this.liabilityRepository,
        },
        input.userId,
        input.updates,
      );
    } catch (error) {
      if (error instanceof TransactionInstrumentValidationError) {
        throw new BulkUpdateTransactionsError(error.message, "VALIDATION");
      }

      throw error;
    }

    const auditFields = listBulkAuditFields(input.updates);

    let updatedCount: number;

    try {
      updatedCount = await this.transactionRepository.bulkUpdateForUser(
        input.userId,
        uniqueIds,
        patch,
        auditFields,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "BULK_UPDATE_OWNERSHIP_MISMATCH") {
        throw new BulkUpdateTransactionsError(
          "Um ou mais lançamentos não foram encontrados",
          "NOT_FOUND",
        );
      }

      throw error;
    }

    return { updatedCount };
  }
}
