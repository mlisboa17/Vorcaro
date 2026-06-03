import type { TransactionType } from "@prisma/client";
import type { ExtractedTransactionType, FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { ExtractionResultRepositoryPort } from "../../domain/ports/extraction-result-repository.port";
import type { InboxRepositoryPort } from "../../domain/ports/inbox-repository.port";
import type { Transaction, TransactionInput } from "@/modules/transactions/domain/ports/transaction-repository.port";
import type { TransactionRepositoryPort } from "@/modules/transactions/domain/ports/transaction-repository.port";
import type {
  CardRepositoryPort,
  CategoryRepositoryPort,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
} from "@/modules/transactions/domain/ports/ownership-validation.port";
import type { UserLearningPatternRepositoryPort } from "../../domain/ports/user-learning-pattern-repository.port";
import { extractLearningKeyword } from "../../domain/utils/learning-keyword";
import { resolveInboxInstallment } from "@/lib/financial/resolve-inbox-installment";
import { ConfirmTransactionError } from "../errors/confirm-transaction.error";
import {
  TransactionInstrumentValidationError,
  validateTransactionInstruments,
} from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";

const CONFIRMABLE_STATUSES = new Set(["READY", "NEEDS_CONFIRMATION"]);

export interface ConfirmTransactionCorrections {
  accountId?: string;
  type?: ExtractedTransactionType;
  amount?: number;
  description?: string;
  categoryId?: string;
  category?: string;
  date?: string;
  paymentMethodId?: string;
  paymentMethod?: string;
  cardId?: string;
  installments?: number;
  installmentGroup?: string;
  currentInstallment?: number;
  totalInstallments?: number;
}

interface MergedConfirmationData {
  accountId?: string;
  type: ExtractedTransactionType;
  amount: number | null;
  description: string | null;
  categoryId?: string;
  category: string | null;
  date: string | null;
  paymentMethodId?: string;
  paymentMethod: string | null;
  cardId?: string;
  installments?: number;
  installmentGroup?: string;
  currentInstallment?: number;
  totalInstallments?: number;
  dataCompra?: string | null;
  dataCaixa?: string | null;
  dataVencimentoFatura?: string | null;
}

export interface ConfirmAndCreateTransactionInput {
  inboxItemId: string;
  userId: string;
  corrections: ConfirmTransactionCorrections;
}

export interface ConfirmAndCreateTransactionOutput {
  transaction: Transaction;
  inboxItemId: string;
  status: "SAVED";
}

export class ConfirmAndCreateTransactionUseCase {
  constructor(
    private readonly inboxRepository: InboxRepositoryPort,
    private readonly extractionResultRepository: ExtractionResultRepositoryPort,
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly financialAccountRepository: FinancialAccountRepositoryPort,
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
    private readonly learningPatternRepository: UserLearningPatternRepositoryPort,
  ) {}

  async execute(input: ConfirmAndCreateTransactionInput): Promise<ConfirmAndCreateTransactionOutput> {
    const item = await this.inboxRepository.findById(input.inboxItemId);

    if (!item) {
      throw new ConfirmTransactionError("Inbox item not found", "NOT_FOUND");
    }

    if (item.userId !== input.userId) {
      throw new ConfirmTransactionError("Forbidden access to inbox item", "FORBIDDEN");
    }

    if (!CONFIRMABLE_STATUSES.has(item.status)) {
      throw new ConfirmTransactionError(
        `Inbox item cannot be confirmed in status: ${item.status}`,
        "INVALID_STATE",
      );
    }

    const extractionResult = await this.extractionResultRepository.findLatestOrCreateFromImport(
      input.inboxItemId,
      input.userId,
    );

    if (!extractionResult) {
      throw new ConfirmTransactionError("No extraction result found for inbox item", "VALIDATION");
    }

    const merged = this.mergeExtractionWithCorrections(
      extractionResult.extractedData,
      input.corrections,
    );

    this.applyInstallmentStructure(input.userId, merged, extractionResult.extractedData, item.rawContent);

    await this.validateOwnership(input.userId, merged);

    await this.assertNoDuplicateInstallment(input.userId, merged);

    const transactionInput = this.buildTransactionInput(
      input.userId,
      input.inboxItemId,
      merged,
      extractionResult.extractedData,
    );

    const transaction = await this.transactionRepository.save(transactionInput);

    await this.inboxRepository.updateStatus(input.inboxItemId, "SAVED");

    void this.recordLearningFromConfirmation(input.userId, merged).catch((error) => {
      console.error("[learning] Failed to record pattern:", error);
    });

    return {
      transaction,
      inboxItemId: input.inboxItemId,
      status: "SAVED",
    };
  }

  private applyInstallmentStructure(
    userId: string,
    merged: MergedConfirmationData,
    extraction: FinancialExtraction,
    rawContent: string,
  ): void {
    if (merged.amount == null || merged.amount <= 0) {
      return;
    }

    const resolved = resolveInboxInstallment({
      userId,
      description: merged.description ?? extraction.description ?? "",
      rawContent,
      amount: merged.amount,
      cardId: merged.cardId ?? extraction.cardId ?? null,
      purchaseDate: merged.date ?? extraction.date ?? null,
      dataCompra: merged.dataCompra ?? extraction.dataCompra ?? extraction.date ?? null,
      dataCaixa: merged.dataCaixa ?? extraction.dataCaixa ?? null,
      dataVencimentoFatura:
        merged.dataVencimentoFatura ?? extraction.dataVencimentoFatura ?? null,
      existingInstallmentGroup: merged.installmentGroup ?? extraction.installmentGroup ?? null,
      existingNumeroParcela:
        merged.currentInstallment ?? extraction.currentInstallment ?? null,
      existingTotalParcelas:
        merged.totalInstallments ?? extraction.totalInstallments ?? null,
      existingDescricaoBase: extraction.descricaoBase ?? null,
    });

    merged.description = resolved.descricaoBase || merged.description;
    merged.currentInstallment = merged.currentInstallment ?? resolved.numeroParcela;
    merged.totalInstallments = merged.totalInstallments ?? resolved.totalParcelas;
    merged.installmentGroup = merged.installmentGroup ?? resolved.installmentGroup ?? undefined;
    merged.installments = merged.totalInstallments ?? merged.installments ?? 1;
    merged.dataCompra = merged.dataCompra ?? resolved.dataCompra;
    merged.dataCaixa = merged.dataCaixa ?? resolved.dataCaixa;
    merged.dataVencimentoFatura =
      merged.dataVencimentoFatura ?? resolved.dataVencimentoFatura;
  }

  private async assertNoDuplicateInstallment(
    userId: string,
    merged: MergedConfirmationData,
  ): Promise<void> {
    const numeroParcela = merged.currentInstallment;
    const totalParcelas = merged.totalInstallments;

    if (
      numeroParcela == null ||
      totalParcelas == null ||
      totalParcelas <= 1 ||
      merged.amount == null ||
      !merged.date ||
      !merged.description
    ) {
      return;
    }

    const duplicate = await this.transactionRepository.findDuplicateInstallmentTransaction({
      userId,
      cardId: merged.cardId ?? null,
      descricaoBase: merged.description,
      numeroParcela,
      totalParcelas,
      valor: merged.amount,
      date: merged.date,
    });

    if (duplicate) {
      throw new ConfirmTransactionError(
        "Transação parcelada duplicada — esta parcela já foi efetivada",
        "DUPLICATE",
      );
    }
  }

  private mergeExtractionWithCorrections(
    extraction: FinancialExtraction,
    corrections: ConfirmTransactionCorrections,
  ): MergedConfirmationData {
    return {
      accountId: corrections.accountId ?? extraction.financialAccountId ?? undefined,
      type: corrections.type ?? extraction.type,
      amount: corrections.amount ?? extraction.amount,
      description: corrections.description ?? extraction.description,
      categoryId: corrections.categoryId ?? extraction.categoryId ?? undefined,
      category: corrections.category ?? extraction.category,
      date: corrections.date ?? extraction.date,
      paymentMethodId: corrections.paymentMethodId ?? extraction.paymentMethodId ?? undefined,
      paymentMethod: corrections.paymentMethod ?? extraction.paymentMethod,
      cardId: corrections.cardId ?? extraction.cardId ?? undefined,
      installments: corrections.installments ?? extraction.installments ?? 1,
      installmentGroup: corrections.installmentGroup ?? extraction.installmentGroup ?? undefined,
      currentInstallment:
        corrections.currentInstallment ?? extraction.currentInstallment ?? undefined,
      totalInstallments:
        corrections.totalInstallments ?? extraction.totalInstallments ?? undefined,
      dataCompra: extraction.dataCompra ?? extraction.date ?? null,
      dataCaixa: extraction.dataCaixa ?? null,
      dataVencimentoFatura: extraction.dataVencimentoFatura ?? null,
    };
  }

  private buildTransactionInput(
    userId: string,
    inboxItemId: string,
    merged: MergedConfirmationData,
    originalExtraction: FinancialExtraction,
  ): TransactionInput {
    const type = this.resolveTransactionType(merged.type);

    if (merged.amount === null || merged.amount === undefined || merged.amount <= 0) {
      throw new ConfirmTransactionError("A valid amount is required to confirm", "VALIDATION");
    }

    if (!merged.description?.trim()) {
      throw new ConfirmTransactionError("A description is required to confirm", "VALIDATION");
    }

    if (!merged.date) {
      throw new ConfirmTransactionError("A date is required to confirm", "VALIDATION");
    }

    if (!merged.paymentMethodId) {
      throw new ConfirmTransactionError("paymentMethodId is required to confirm", "VALIDATION");
    }

    if (!merged.categoryId) {
      throw new ConfirmTransactionError("categoryId is required to confirm", "VALIDATION");
    }

    if (!merged.accountId) {
      throw new ConfirmTransactionError("accountId is required to confirm", "VALIDATION");
    }

    const date = this.parseDate(merged.date);

    if (
      merged.currentInstallment !== undefined &&
      merged.totalInstallments !== undefined &&
      merged.currentInstallment > merged.totalInstallments
    ) {
      throw new ConfirmTransactionError(
        "currentInstallment cannot exceed totalInstallments",
        "VALIDATION",
      );
    }

    const installmentGroup = merged.installmentGroup ?? undefined;
    const numeroParcela = merged.currentInstallment;
    const totalParcelas = merged.totalInstallments;

    return {
      userId,
      accountId: merged.accountId,
      type,
      amount: merged.amount,
      description: merged.description.trim(),
      date,
      dataCompra: merged.dataCompra ? this.parseDate(merged.dataCompra) : undefined,
      dataCaixa: merged.dataCaixa ? this.parseDate(merged.dataCaixa) : undefined,
      dataVencimentoFatura: merged.dataVencimentoFatura
        ? this.parseDate(merged.dataVencimentoFatura)
        : undefined,
      categoryId: merged.categoryId,
      paymentMethodId: merged.paymentMethodId,
      cardId: merged.cardId,
      inboxItemId,
      installments: totalParcelas ?? merged.installments ?? 1,
      installmentGroup,
      idGrupoParcelamento: installmentGroup,
      currentInstallment: numeroParcela,
      totalInstallments: totalParcelas,
      numeroParcela,
      totalParcelas,
      metadata: {
        source: "financial-inbox",
        categoryLabel: merged.category,
        paymentMethodLabel: merged.paymentMethod,
        originalExtraction,
      },
    };
  }

  private resolveTransactionType(type: ExtractedTransactionType): TransactionType {
    if (type === "UNKNOWN") {
      throw new ConfirmTransactionError(
        "Transaction type must be provided (EXPENSE, INCOME or TRANSFER)",
        "VALIDATION",
      );
    }

    return type;
  }

  private parseDate(value: string): Date {
    const parsed = new Date(`${value}T12:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new ConfirmTransactionError("Invalid date format", "VALIDATION");
    }

    return parsed;
  }

  private async validateOwnership(userId: string, merged: MergedConfirmationData): Promise<void> {
    if (!merged.categoryId || !merged.accountId || !merged.paymentMethodId) {
      throw new ConfirmTransactionError(
        "categoryId, accountId and paymentMethodId are required to confirm",
        "VALIDATION",
      );
    }

    try {
      const validated = await validateTransactionInstruments(
        {
          categoryRepository: this.categoryRepository,
          financialAccountRepository: this.financialAccountRepository,
          paymentMethodRepository: this.paymentMethodRepository,
          cardRepository: this.cardRepository,
        },
        {
          userId,
          categoryId: merged.categoryId,
          accountId: merged.accountId,
          paymentMethodId: merged.paymentMethodId,
          cardId: merged.cardId,
        },
      );

      merged.cardId = validated.cardId ?? undefined;
    } catch (error) {
      if (error instanceof TransactionInstrumentValidationError) {
        throw new ConfirmTransactionError(error.message, "VALIDATION");
      }
      throw error;
    }
  }

  private async recordLearningFromConfirmation(
    userId: string,
    merged: MergedConfirmationData,
  ): Promise<void> {
    if (!merged.description?.trim()) {
      return;
    }

    const keyword = extractLearningKeyword(merged.description);

    if (merged.categoryId) {
      await this.learningPatternRepository.recordOrIncrement({
        userId,
        patternType: "categorization_preference",
        inputSignal: { keyword },
        outputSignal: {
          categoryId: merged.categoryId,
          category: merged.category ?? undefined,
        },
      });
    }

    if (merged.paymentMethodId) {
      await this.learningPatternRepository.recordOrIncrement({
        userId,
        patternType: "payment_method_preference",
        inputSignal: { keyword },
        outputSignal: {
          paymentMethodId: merged.paymentMethodId,
          paymentMethod: merged.paymentMethod ?? undefined,
        },
      });
    }
  }
}
