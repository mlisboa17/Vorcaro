import { ConfirmTransactionError } from "../errors/confirm-transaction.error";
import type { ConfirmAndCreateTransactionUseCase } from "./confirm-and-create-transaction.use-case";

export interface BatchConfirmFailedItem {
  id: string;
  reason: string;
}

export interface BatchConfirmInboxItemsResult {
  confirmed: string[];
  skipped: string[];
  failed: BatchConfirmFailedItem[];
}

export class BatchConfirmInboxItemsUseCase {
  constructor(private readonly confirmUseCase: ConfirmAndCreateTransactionUseCase) {}

  async execute(input: {
    userId: string;
    inboxItemIds: string[];
  }): Promise<BatchConfirmInboxItemsResult> {
    const result: BatchConfirmInboxItemsResult = {
      confirmed: [],
      skipped: [],
      failed: [],
    };

    for (const inboxItemId of input.inboxItemIds) {
      try {
        await this.confirmUseCase.execute({
          inboxItemId,
          userId: input.userId,
          corrections: {},
        });
        result.confirmed.push(inboxItemId);
      } catch (error) {
        if (error instanceof ConfirmTransactionError) {
          if (error.code === "INVALID_STATE" || error.code === "DUPLICATE") {
            result.skipped.push(inboxItemId);
            continue;
          }
          result.failed.push({ id: inboxItemId, reason: error.message });
          continue;
        }

        result.failed.push({
          id: inboxItemId,
          reason: error instanceof Error ? error.message : "Erro inesperado",
        });
      }
    }

    return result;
  }
}
