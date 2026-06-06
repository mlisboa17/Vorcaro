import type { PrismaClient, TransactionMethod } from "@prisma/client";
import { normalizeSupplierName } from "../../domain/services/financial-document-parser.service";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";

export type LearningDecisionInput = {
  userId: string;
  method: TransactionMethod;
  pixKey?: string | null;
  documentNumber?: string | null;
  supplier?: string | null;
  payerName?: string | null;
  receiverName?: string | null;
  payerDocument?: string | null;
  receiverDocument?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
};

export class FinancialDocumentLearningService {
  private readonly repo: PrismaFinancialDocumentRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
  }

  async recordDecision(input: LearningDecisionInput): Promise<void> {
    const pixKey = input.pixKey?.trim().toLowerCase() || null;
    const documentNumbers = [
      input.documentNumber,
      input.payerDocument,
      input.receiverDocument,
    ]
      .map((value) => value?.replace(/\D/g, "") || null)
      .filter(Boolean) as string[];

    const normalizedNames = [
      input.supplier,
      input.receiverName,
      input.payerName,
    ]
      .map((value) => normalizeSupplierName(value))
      .filter(Boolean);

    if (pixKey) {
      await this.repo.upsertLearningPattern(
        input.userId,
        { method: input.method, pixKey },
        { categoryId: input.categoryId, subcategoryId: input.subcategoryId },
      );
    }

    for (const documentNumber of new Set(documentNumbers)) {
      await this.repo.upsertLearningPattern(
        input.userId,
        { method: input.method, documentNumber },
        { categoryId: input.categoryId, subcategoryId: input.subcategoryId },
      );
    }

    for (const normalizedName of new Set(normalizedNames)) {
      await this.repo.upsertLearningPattern(
        input.userId,
        { method: input.method, normalizedName },
        { categoryId: input.categoryId, subcategoryId: input.subcategoryId },
      );
    }
  }

  listPatterns(userId: string) {
    return this.repo.listLearningPatterns(userId);
  }

  updatePattern(
    userId: string,
    id: string,
    data: { categoryId?: string | null; subcategoryId?: string | null },
  ) {
    return this.repo.updateLearningPattern(userId, id, data);
  }

  deletePattern(userId: string, id: string) {
    return this.repo.deleteLearningPattern(userId, id);
  }
}
