import type { FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { ExtractionResultRepositoryPort } from "../../domain/ports/extraction-result-repository.port";
import type { InboxRepositoryPort } from "../../domain/ports/inbox-repository.port";
import type { InboxPendingCorrections } from "../../domain/schemas/inbox-pending-corrections.schema";
import {
  TransactionInstrumentValidationError,
} from "../../application/validators/transaction-instrument.validator";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "@/modules/transactions/domain/ports/ownership-validation.port";
import { BatchInboxError } from "../errors/batch-inbox.error";

export interface BatchUpdateInboxItemsInput {
  userId: string;
  inboxItemIds: string[];
  patch: InboxPendingCorrections;
}

export interface BatchUpdateFailedItem {
  id: string;
  reason: string;
}

export interface BatchUpdateInboxItemsResult {
  updated: string[];
  skipped: string[];
  failed: BatchUpdateFailedItem[];
}

export class BatchUpdateInboxItemsUseCase {
  constructor(
    private readonly inboxRepository: InboxRepositoryPort,
    private readonly extractionRepository: ExtractionResultRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
  ) {}

  async execute(input: BatchUpdateInboxItemsInput): Promise<BatchUpdateInboxItemsResult> {
    if (Object.keys(input.patch).length === 0) {
      throw new BatchInboxError("Informe ao menos um campo para alterar.");
    }

    const result: BatchUpdateInboxItemsResult = {
      updated: [],
      skipped: [],
      failed: [],
    };

    for (const inboxItemId of input.inboxItemIds) {
      const item = await this.inboxRepository.findById(inboxItemId);

      if (!item || item.userId !== input.userId) {
        result.failed.push({ id: inboxItemId, reason: "Item não encontrado" });
        continue;
      }

      if (item.status === "SAVED") {
        result.skipped.push(inboxItemId);
        continue;
      }

      const extraction = await this.extractionRepository.findLatestByInboxItemId(inboxItemId);

      if (!extraction) {
        result.failed.push({ id: inboxItemId, reason: "Extração não encontrada" });
        continue;
      }

      try {
        if (input.patch.categoryId) {
          const valid = await this.categoryRepository.belongsToUser(
            input.patch.categoryId,
            input.userId,
          );
          if (!valid) {
            throw new TransactionInstrumentValidationError("Categoria não encontrada ou inválida");
          }
        }

        if (input.patch.accountId) {
          const account = await this.financialAccountRepository.findActiveByIdForUser(
            input.patch.accountId,
            input.userId,
          );
          if (!account) {
            throw new TransactionInstrumentValidationError(
              "Conta financeira não encontrada ou inválida",
            );
          }
        }

        if (input.patch.paymentMethodId) {
          const paymentMethod = await this.paymentMethodRepository.findActiveByIdForUser(
            input.patch.paymentMethodId,
            input.userId,
          );
          if (!paymentMethod) {
            throw new TransactionInstrumentValidationError(
              "Forma de pagamento não encontrada ou inválida",
            );
          }

          if (input.patch.cardId) {
            const cardValid = await this.cardRepository.belongsToUser(
              input.patch.cardId,
              input.userId,
            );
            if (!cardValid) {
              throw new TransactionInstrumentValidationError("Cartão não encontrado ou inválido");
            }
          }
        } else if (input.patch.cardId) {
          const cardValid = await this.cardRepository.belongsToUser(input.patch.cardId, input.userId);
          if (!cardValid) {
            throw new TransactionInstrumentValidationError("Cartão não encontrado ou inválido");
          }
        }
      } catch (error) {
        if (error instanceof TransactionInstrumentValidationError) {
          result.failed.push({ id: inboxItemId, reason: error.message });
          continue;
        }

        throw error;
      }

      const merged = this.mergePatch(extraction.extractedData, input.patch);
      await this.extractionRepository.updateExtractedData(extraction.id, merged);
      result.updated.push(inboxItemId);
    }

    return result;
  }

  private mergePatch(
    current: FinancialExtraction,
    patch: InboxPendingCorrections,
  ): FinancialExtraction {
    return {
      ...current,
      ...(patch.categoryId ? { categoryId: patch.categoryId } : {}),
      ...(patch.accountId ? { financialAccountId: patch.accountId } : {}),
      ...(patch.paymentMethodId ? { paymentMethodId: patch.paymentMethodId } : {}),
      ...(patch.cardId !== undefined ? { cardId: patch.cardId } : {}),
      ...(patch.dataCompra ? { date: patch.dataCompra } : {}),
      ...(patch.dataCaixa ? { dataCaixa: patch.dataCaixa } : {}),
      ...(patch.dataVencimentoFatura
        ? { dataVencimentoFatura: patch.dataVencimentoFatura }
        : {}),
    } as FinancialExtraction;
  }
}
