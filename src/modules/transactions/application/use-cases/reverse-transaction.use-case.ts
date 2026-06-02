import type { InboxStatus, PrismaClient } from "@prisma/client";
import { parseFinancialExtraction } from "@/modules/financial-inbox/domain/schemas/financial-extraction.schema";
import { resolveInboxReviewStatus } from "@/modules/financial-inbox/domain/utils/resolve-inbox-review-status";
import { LiabilityAmortizationService } from "@/modules/patrimony/application/services/liability-amortization.service";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";
import type { PatrimonyLiabilityRepositoryPort } from "@/modules/patrimony/domain/ports/patrimony.port";
import type { TransactionRepositoryPort } from "../../domain/ports/transaction-repository.port";

export class ReverseTransactionError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION",
  ) {
    super(message);
    this.name = "ReverseTransactionError";
  }
}

export interface ReverseTransactionInput {
  transactionId: string;
  userId: string;
}

export interface ReverseTransactionOutput {
  transactionId: string;
  inboxItemId: string | null;
  restoredInboxStatus: InboxStatus | null;
}

export class ReverseTransactionUseCase {
  private readonly amortization: LiabilityAmortizationService;

  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly db: PrismaClient,
    liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {
    this.amortization = new LiabilityAmortizationService(liabilityRepository);
  }

  async execute(input: ReverseTransactionInput): Promise<ReverseTransactionOutput> {
    const transaction = await this.transactionRepository.findByIdForUser(
      input.transactionId,
      input.userId,
    );

    if (!transaction) {
      throw new ReverseTransactionError("Transaction not found", "NOT_FOUND");
    }

    if (transaction.liabilityId) {
      try {
        await this.amortization.revertAppliedAmortization({
          liabilityId: transaction.liabilityId,
          userId: input.userId,
          metadata: transaction.metadata,
        });
      } catch (error) {
        if (error instanceof PatrimonyError) {
          throw new ReverseTransactionError(error.message, "VALIDATION");
        }

        throw error;
      }
    }

    const inboxItemId = transaction.inboxItemId;

    await this.db.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: transaction.id } });

      if (!inboxItemId) {
        return;
      }

      const extraction = await tx.extractionResult.findFirst({
        where: { inboxItemId },
        orderBy: { createdAt: "desc" },
      });

      const restoredStatus: InboxStatus = extraction
        ? resolveInboxReviewStatus(parseFinancialExtraction(extraction.extractedData))
        : "READY";

      await tx.financialInbox.update({
        where: { id: inboxItemId },
        data: {
          status: restoredStatus,
          errorMessage: null,
        },
      });
    });

    const restoredInboxStatus = inboxItemId
      ? (
          await this.db.financialInbox.findUnique({
            where: { id: inboxItemId },
            select: { status: true },
          })
        )?.status ?? null
      : null;

    return {
      transactionId: transaction.id,
      inboxItemId,
      restoredInboxStatus,
    };
  }
}
