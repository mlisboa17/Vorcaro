import type { PrismaClient } from "@prisma/client";

import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

import { AUTO_APPROVAL_THRESHOLD } from "../../domain/constants/financial-document-review.constants";
import { readPartiesMetadata } from "../../domain/services/financial-parties-metadata.service";

import type { SuggestionEditInput } from "../../domain/types/financial-document.types";

import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";

import {

  diffSuggestionFields,

  FinancialDocumentAuditService,

} from "./financial-document-audit.service";

import { FinancialDocumentLearningService } from "./financial-document-learning.service";



export class FinancialDocumentSuggestionError extends Error {

  constructor(

    message: string,

    readonly code:

      | "NOT_FOUND"

      | "INVALID_STATE"

      | "MISSING_ACCOUNT"

      | "LOW_CONFIDENCE_REVIEW_REQUIRED",

  ) {

    super(message);

    this.name = "FinancialDocumentSuggestionError";

  }

}



export type ApproveSuggestionOptions = {

  accountId?: string;

  acknowledgedLowConfidence?: boolean;

};



const EDITABLE_KEYS = [

  "amount",

  "date",

  "description",

  "supplier",

  "categoryId",

  "subcategoryId",

] as const;



function snapshotSuggestion(s: {

  amount: unknown;

  date: unknown;

  description: unknown;

  supplier: unknown;

  categoryId: unknown;

  subcategoryId: unknown;

}) {

  return {

    amount: s.amount != null ? Number(s.amount) : null,

    date: s.date instanceof Date ? s.date.toISOString() : s.date,

    description: s.description,

    supplier: s.supplier,

    categoryId: s.categoryId,

    subcategoryId: s.subcategoryId,

  };

}



export class FinancialDocumentSuggestionService {

  private readonly repo: PrismaFinancialDocumentRepository;

  private readonly learning: FinancialDocumentLearningService;

  private readonly transactions: PrismaTransactionRepository;

  private readonly audit: FinancialDocumentAuditService;



  constructor(private readonly prisma: PrismaClient) {

    this.repo = new PrismaFinancialDocumentRepository(prisma);

    this.learning = new FinancialDocumentLearningService(prisma);

    this.transactions = new PrismaTransactionRepository(prisma);

    this.audit = new FinancialDocumentAuditService(prisma);

  }



  listPending(userId: string) {

    return this.repo.listSuggestions(userId, "PENDING");

  }



  async edit(userId: string, suggestionId: string, patch: SuggestionEditInput) {

    const suggestion = await this.repo.findSuggestionById(userId, suggestionId);

    if (!suggestion) {

      throw new FinancialDocumentSuggestionError("Sugestão não encontrada", "NOT_FOUND");

    }

    if (suggestion.status !== "PENDING" && suggestion.status !== "EDITED") {

      throw new FinancialDocumentSuggestionError("Sugestão não está pendente", "INVALID_STATE");

    }



    const before = snapshotSuggestion(suggestion);

    const updated = await this.repo.updateSuggestion(suggestionId, {

      status: "EDITED",

      ...(patch.amount != null ? { amount: patch.amount } : {}),

      ...(patch.date ? { date: new Date(patch.date) } : {}),

      ...(patch.description != null ? { description: patch.description } : {}),

      ...(patch.supplier != null ? { supplier: patch.supplier } : {}),

      ...(patch.categoryId != null ? { categoryId: patch.categoryId } : {}),

      ...(patch.subcategoryId != null ? { subcategoryId: patch.subcategoryId } : {}),

      metadata: {

        ...(typeof suggestion.metadata === "object" && suggestion.metadata ? suggestion.metadata : {}),

        ...(patch.accountId ? { accountId: patch.accountId } : {}),

        editedAt: new Date().toISOString(),

        editedByUserId: userId,

        manuallyReviewed: true,

      },

    });



    const after = snapshotSuggestion(updated);

    const changedFields = diffSuggestionFields(before, after, [...EDITABLE_KEYS]);

    if (Object.keys(changedFields).length > 0) {

      await this.audit.record({

        userId,

        documentId: suggestion.documentId,

        suggestionId,

        action: "EDITED",

        changedFields,

      });

    }



    return updated;

  }



  async reject(userId: string, suggestionId: string) {

    const suggestion = await this.repo.findSuggestionById(userId, suggestionId);

    if (!suggestion) {

      throw new FinancialDocumentSuggestionError("Sugestão não encontrada", "NOT_FOUND");

    }



    await this.repo.updateSuggestion(suggestionId, { status: "REJECTED" });

    await this.repo.updateDocument(suggestion.documentId, { status: "REJECTED" });



    await this.audit.record({

      userId,

      documentId: suggestion.documentId,

      suggestionId,

      action: "REJECTED",

    });



    return { ok: true };

  }



  async approve(userId: string, suggestionId: string, options?: ApproveSuggestionOptions) {

    const suggestion = await this.repo.findSuggestionById(userId, suggestionId);

    if (!suggestion) {

      throw new FinancialDocumentSuggestionError("Sugestão não encontrada", "NOT_FOUND");

    }

    if (suggestion.status !== "PENDING" && suggestion.status !== "EDITED") {

      throw new FinancialDocumentSuggestionError("Sugestão não pode ser aprovada", "INVALID_STATE");

    }

    if (suggestion.amount == null || !suggestion.date) {

      throw new FinancialDocumentSuggestionError("Sugestão incompleta para lançamento", "INVALID_STATE");

    }



    const metadata =

      typeof suggestion.metadata === "object" && suggestion.metadata

        ? (suggestion.metadata as Record<string, unknown>)

        : {};



    const requiresReview =

      suggestion.confidence < AUTO_APPROVAL_THRESHOLD ||

      metadata.requiresMandatoryReview === true;



    const manuallyReviewed =

      suggestion.status === "EDITED" || metadata.manuallyReviewed === true;



    if (requiresReview && !manuallyReviewed && !options?.acknowledgedLowConfidence) {

      throw new FinancialDocumentSuggestionError(

        "Revisão obrigatória: confirme que revisou os dados antes de aprovar.",

        "LOW_CONFIDENCE_REVIEW_REQUIRED",

      );

    }



    const accountId =

      options?.accountId ??

      (typeof metadata.accountId === "string" ? metadata.accountId : undefined) ??

      (await this.prisma.financialAccount.findFirst({

        where: { userId, isActive: true },

        select: { id: true },

        orderBy: { createdAt: "asc" },

      }))?.id;



    if (!accountId) {

      throw new FinancialDocumentSuggestionError(

        "Conta financeira não informada. Edite a sugestão no dashboard.",

        "MISSING_ACCOUNT",

      );

    }



    const ownedAccount = await this.prisma.financialAccount.findFirst({

      where: { id: accountId, userId, isActive: true },

    });

    if (!ownedAccount) {

      throw new FinancialDocumentSuggestionError("Conta financeira inválida", "NOT_FOUND");

    }



    const categoryId = suggestion.subcategoryId ?? suggestion.categoryId ?? undefined;



    const transaction = await this.transactions.save({

      userId,

      accountId,

      amount: Number(suggestion.amount),

      description: suggestion.description ?? suggestion.supplier ?? "Importação documento",

      type: "EXPENSE",

      date: suggestion.date,

      categoryId,

      metadata: {

        financialDocumentId: suggestion.documentId,

        financialDocumentSuggestionId: suggestion.id,

        method: suggestion.method,

        source: "financial_document_import",

      },

    });



    await this.repo.updateSuggestion(suggestionId, {

      status: "APPROVED",

      metadata: {

        ...metadata,

        approvedAt: new Date().toISOString(),

        approvedByUserId: userId,

        finalCategoryId: suggestion.categoryId,

        finalSubcategoryId: suggestion.subcategoryId,

        transactionId: transaction.id,

      },

    });

    await this.repo.updateDocument(suggestion.documentId, { status: "APPROVED" });



    await this.audit.record({

      userId,

      documentId: suggestion.documentId,

      suggestionId,

      action: "APPROVED",

      changedFields: {

        status: { before: suggestion.status, after: "APPROVED" },

        transactionId: { before: null, after: transaction.id },

      },

    });



    const parties = readPartiesMetadata(metadata.parties);

    await this.learning.recordDecision({
      userId,
      method: suggestion.method ?? "OUTROS",
      pixKey: typeof metadata.pixKey === "string" ? metadata.pixKey : parties.pixKey ?? null,
      documentNumber:
        typeof metadata.documentNumber === "string" ? metadata.documentNumber : parties.transactionIdentifier ?? null,
      supplier: suggestion.supplier,
      payerName: parties.payerName ?? null,
      receiverName: parties.receiverName ?? suggestion.supplier ?? null,
      payerDocument: parties.payerDocument ?? null,
      receiverDocument: parties.receiverDocument ?? null,
      categoryId: suggestion.categoryId,
      subcategoryId: suggestion.subcategoryId,
    });



    return { transactionId: transaction.id };

  }

}

