import type { PrismaClient, TransactionType } from "@prisma/client";
import { addMonthsPreserveDay, clampDayToMonth } from "@/modules/financial/core/calculate-credit-card-cash-date";
import { buildInstallmentDedupKey } from "@/lib/financial/installment-structural-parser";
import { buildStableInstallmentGroupId } from "@/lib/financial/installment-structural-parser";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";
import type {
  ExtractedBankStatementTransaction,
  ExtractedInstallmentPurchase,
  FinancialDocumentBatchReview,
} from "../../domain/types/financial-document-import.types";
import { readBatchReviewFromJson } from "../../domain/services/financial-document-import-analyzer.service";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";
import { FinancialDocumentAuditService } from "./financial-document-audit.service";

export type ConfirmDocumentLinesInput = {
  selectedLineIds: string[];
  lines?: Array<Partial<ExtractedBankStatementTransaction> & { id: string }>;
  installmentActions?: Array<{
    purchaseId: string;
    createFutureInstallments: boolean;
    cardId?: string;
  }>;
  accountId?: string;
};

export class FinancialDocumentLinesConfirmService {
  private readonly repo: PrismaFinancialDocumentRepository;
  private readonly transactions: PrismaTransactionRepository;
  private readonly audit: FinancialDocumentAuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
    this.transactions = new PrismaTransactionRepository(prisma);
    this.audit = new FinancialDocumentAuditService(prisma);
  }

  async getLines(userId: string, documentId: string) {
    const document = await this.repo.findDocumentById(userId, documentId);
    if (!document) return null;

    const suggestion = document.suggestions[0];
    const meta =
      typeof suggestion?.metadata === "object" && suggestion.metadata
        ? (suggestion.metadata as Record<string, unknown>)
        : {};
    const docJson =
      typeof document.extractedJson === "object" && document.extractedJson
        ? (document.extractedJson as Record<string, unknown>)
        : {};

    const batchReview =
      readBatchReviewFromJson(meta.batchReview) ?? readBatchReviewFromJson(docJson.batchReview);

    if (!batchReview?.batchReviewRequired) {
      return { documentId, batchReview: null };
    }

    return { documentId, batchReview, suggestionId: suggestion?.id ?? null };
  }

  async confirm(userId: string, documentId: string, input: ConfirmDocumentLinesInput) {
    const document = await this.repo.findDocumentById(userId, documentId);
    if (!document) return null;

    if (document.status === "APPROVED") {
      throw new Error("Documento já aprovado");
    }

    const linesData = await this.getLines(userId, documentId);
    if (!linesData?.batchReview) {
      throw new Error("Documento não possui revisão em lote");
    }

    const batchReview = this.applyLineEdits(linesData.batchReview, input.lines);
    const selectedIds = new Set(input.selectedLineIds);
    const selectedLines = batchReview.bankStatementTransactions.filter((line) =>
      selectedIds.has(line.id),
    );

    if (selectedLines.length === 0 && !(input.installmentActions?.length ?? 0)) {
      throw new Error("Selecione ao menos um lançamento para importar");
    }

    const accountId =
      input.accountId ??
      (
        await this.prisma.financialAccount.findFirst({
          where: { userId, isActive: true },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })
      )?.id;

    if (!accountId) {
      throw new Error("Conta financeira não encontrada");
    }

    const createdTransactionIds: string[] = [];
    let skippedDuplicates = 0;

    for (const line of selectedLines) {
      if (!line.amount || line.amount <= 0) {
        throw new Error(
          `O lançamento "${line.description.slice(0, 40)}" não tem valor válido. Informe o valor antes de confirmar.`,
        );
      }

      if (line.fingerprint) {
        const duplicate = await this.prisma.transaction.findFirst({
          where: {
            userId,
            metadata: { path: ["lineFingerprint"], equals: line.fingerprint },
          },
          select: { id: true },
        });
        if (duplicate) {
          skippedDuplicates += 1;
          createdTransactionIds.push(duplicate.id);
          continue;
        }
      }

      const type: TransactionType = line.direction === "INCOME" ? "INCOME" : "EXPENSE";
      const saved = await this.transactions.save({
        userId,
        accountId,
        amount: line.amount,
        description: line.description,
        type,
        date: new Date(`${line.date}T12:00:00.000Z`),
        metadata: {
          financialDocumentId: documentId,
          source: "financial_document_batch_import",
          method: line.method,
          documentNumber: line.documentNumber,
          lineId: line.id,
          lineFingerprint: line.fingerprint,
          rawLine: line.rawLine,
        },
      });
      createdTransactionIds.push(saved.id);
    }

    const installmentResults: Array<{ purchaseId: string; createdCount: number; skipped: number }> =
      [];

    for (const action of input.installmentActions ?? []) {
      const purchase = batchReview.installmentPurchases.find((p) => p.id === action.purchaseId);
      if (!purchase || !action.createFutureInstallments) continue;

      const { created, skipped } = await this.createFutureInstallments(userId, {
        purchase,
        documentId,
        accountId,
        cardId: action.cardId,
      });
      installmentResults.push({
        purchaseId: action.purchaseId,
        createdCount: created,
        skipped,
      });
    }

    const suggestion = document.suggestions[0];
    if (suggestion) {
      await this.repo.updateSuggestion(suggestion.id, {
        status: "APPROVED",
        metadata: {
          ...(typeof suggestion.metadata === "object" && suggestion.metadata
            ? (suggestion.metadata as Record<string, unknown>)
            : {}),
          approvedAt: new Date().toISOString(),
          batchConfirmedLineIds: input.selectedLineIds,
          installmentResults,
          transactionIds: createdTransactionIds,
        },
      });
    }

    await this.repo.updateDocument(documentId, { status: "APPROVED" });

    await this.audit.record({
      userId,
      documentId,
      suggestionId: suggestion?.id,
      action: "APPROVED",
      changedFields: {
        batchLines: { before: null, after: input.selectedLineIds.length },
        transactions: { before: null, after: createdTransactionIds.length },
      },
    });

    return {
      documentId,
      transactionIds: createdTransactionIds,
      installmentResults,
      skippedDuplicates,
    };
  }

  private applyLineEdits(
    batchReview: FinancialDocumentBatchReview,
    edits?: Array<Partial<ExtractedBankStatementTransaction> & { id: string }>,
  ): FinancialDocumentBatchReview {
    if (!edits?.length) return batchReview;
    const byId = new Map(edits.map((e) => [e.id, e]));
    return {
      ...batchReview,
      bankStatementTransactions: batchReview.bankStatementTransactions.map((line) => {
        const edit = byId.get(line.id);
        return edit ? { ...line, ...edit } : line;
      }),
    };
  }

  private async createFutureInstallments(
    userId: string,
    input: {
      purchase: ExtractedInstallmentPurchase;
      documentId: string;
      accountId: string;
      cardId?: string;
    },
  ): Promise<{ created: number; skipped: number }> {
    const { purchase } = input;
    let created = 0;
    let skipped = 0;

    const groupId = buildStableInstallmentGroupId({
      userId,
      cardId: input.cardId ?? null,
      descricaoBase: purchase.merchant,
      valorParcela: purchase.installmentAmount,
      totalParcelas: purchase.totalInstallments,
      primeiraParcelaAproximada: purchase.purchaseDate ?? new Date().toISOString().slice(0, 10),
    });

    // Âncora: a parcela futura deve cair sempre no dia de vencimento da fatura,
    // independente do dia da compra original. Preferimos o dueDate informado pela
    // própria fatura; na ausência dele, usamos o dueDay cadastrado do cartão.
    let anchorDate: Date;
    if (purchase.dueDate) {
      anchorDate = new Date(`${purchase.dueDate}T12:00:00.000Z`);
    } else if (input.cardId) {
      const card = await this.prisma.card.findUnique({
        where: { id: input.cardId },
        select: { dueDay: true },
      });
      const fallback = purchase.purchaseDate
        ? new Date(`${purchase.purchaseDate}T12:00:00.000Z`)
        : new Date();
      anchorDate = card?.dueDay
        ? clampDayToMonth(fallback.getUTCFullYear(), fallback.getUTCMonth(), card.dueDay)
        : fallback;
    } else {
      anchorDate = purchase.purchaseDate
        ? new Date(`${purchase.purchaseDate}T12:00:00.000Z`)
        : new Date();
    }

    for (let parcel = purchase.currentInstallment + 1; parcel <= purchase.totalInstallments; parcel += 1) {
      const installmentDate = addMonthsPreserveDay(
        anchorDate,
        parcel - purchase.currentInstallment,
      );
      const dateKey = installmentDate.toISOString().slice(0, 10);

      const dedupKey = buildInstallmentDedupKey({
        cardId: input.cardId ?? null,
        descricaoBase: purchase.merchant,
        numeroParcela: parcel,
        totalParcelas: purchase.totalInstallments,
        valor: purchase.installmentAmount,
        date: dateKey,
      });

      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId,
          metadata: { path: ["installmentDedupKey"], equals: dedupKey },
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await this.transactions.save({
        userId,
        accountId: input.accountId,
        cardId: input.cardId,
        amount: purchase.installmentAmount,
        description: `${purchase.merchant} (${parcel}/${purchase.totalInstallments})`,
        type: "EXPENSE",
        date: installmentDate,
        dataCompra: installmentDate,
        dataVencimentoFatura: installmentDate,
        installments: purchase.totalInstallments,
        installmentGroup: groupId,
        currentInstallment: parcel,
        totalInstallments: purchase.totalInstallments,
        numeroParcela: parcel,
        totalParcelas: purchase.totalInstallments,
        idGrupoParcelamento: groupId,
        metadata: {
          financialDocumentId: input.documentId,
          source: "financial_document_installment_projection",
          installmentDedupKey: dedupKey,
          installmentFingerprint: purchase.fingerprint,
          projected: true,
        },
      });
      created += 1;
    }

    return { created, skipped };
  }
}
