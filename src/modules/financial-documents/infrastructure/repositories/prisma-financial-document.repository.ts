import type {
  FinancialDocument,
  FinancialDocumentLearningPattern,
  FinancialDocumentSuggestion,
  FinancialDocumentStatus,
  FinancialDocumentSuggestionStatus,
  Prisma,
  PrismaClient,
  TransactionMethod,
} from "@prisma/client";

export class PrismaFinancialDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createDocument(data: Prisma.FinancialDocumentCreateInput): Promise<FinancialDocument> {
    return this.prisma.financialDocument.create({ data });
  }

  findDocumentById(userId: string, id: string) {
    return this.prisma.financialDocument.findFirst({
      where: { id, userId },
      include: {
        suggestions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  findDocumentByFingerprint(userId: string, fingerprint: string) {
    return this.prisma.financialDocument.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
    });
  }

  listDocuments(userId: string, status?: FinancialDocumentStatus, limit = 50) {
    return this.prisma.financialDocument.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        suggestions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  updateDocument(id: string, data: Prisma.FinancialDocumentUpdateInput) {
    return this.prisma.financialDocument.update({ where: { id }, data });
  }

  createSuggestion(data: Prisma.FinancialDocumentSuggestionUncheckedCreateInput): Promise<FinancialDocumentSuggestion> {
    return this.prisma.financialDocumentSuggestion.create({ data });
  }

  findSuggestionById(userId: string, id: string) {
    return this.prisma.financialDocumentSuggestion.findFirst({
      where: { id, userId },
      include: { document: true },
    });
  }

  listSuggestions(userId: string, status?: FinancialDocumentSuggestionStatus, limit = 50) {
    return this.prisma.financialDocumentSuggestion.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { document: true },
    });
  }

  updateSuggestion(id: string, data: Prisma.FinancialDocumentSuggestionUpdateInput) {
    return this.prisma.financialDocumentSuggestion.update({ where: { id }, data });
  }

  listLearningPatterns(userId: string) {
    return this.prisma.financialDocumentLearningPattern.findMany({
      where: { userId },
      orderBy: [{ occurrences: "desc" }, { lastUsedAt: "desc" }],
    });
  }

  findLearningPattern(userId: string, where: {
    method: TransactionMethod;
    pixKey?: string | null;
    documentNumber?: string | null;
    normalizedName?: string | null;
  }) {
    return this.prisma.financialDocumentLearningPattern.findFirst({
      where: {
        userId,
        method: where.method,
        ...(where.pixKey ? { pixKey: where.pixKey } : {}),
        ...(where.documentNumber ? { documentNumber: where.documentNumber } : {}),
        ...(where.normalizedName ? { normalizedName: where.normalizedName } : {}),
      },
    });
  }

  upsertLearningPattern(
    userId: string,
    key: {
      method: TransactionMethod;
      pixKey?: string | null;
      documentNumber?: string | null;
      normalizedName?: string | null;
    },
    data: { categoryId?: string | null; subcategoryId?: string | null },
  ): Promise<FinancialDocumentLearningPattern> {
    const existing = this.prisma.financialDocumentLearningPattern.findFirst({
      where: {
        userId,
        method: key.method,
        pixKey: key.pixKey ?? null,
        documentNumber: key.documentNumber ?? null,
        normalizedName: key.normalizedName ?? null,
      },
    });

    return existing.then(async (row) => {
      if (row) {
        return this.prisma.financialDocumentLearningPattern.update({
          where: { id: row.id },
          data: {
            categoryId: data.categoryId ?? row.categoryId,
            subcategoryId: data.subcategoryId ?? row.subcategoryId,
            occurrences: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      }
      return this.prisma.financialDocumentLearningPattern.create({
        data: {
          user: { connect: { id: userId } },
          method: key.method,
          pixKey: key.pixKey ?? null,
          documentNumber: key.documentNumber ?? null,
          normalizedName: key.normalizedName ?? null,
          categoryId: data.categoryId ?? null,
          subcategoryId: data.subcategoryId ?? null,
          lastUsedAt: new Date(),
        },
      });
    });
  }

  updateLearningPattern(userId: string, id: string, data: Prisma.FinancialDocumentLearningPatternUpdateInput) {
    return this.prisma.financialDocumentLearningPattern.updateMany({
      where: { id, userId },
      data,
    });
  }

  deleteLearningPattern(userId: string, id: string) {
    return this.prisma.financialDocumentLearningPattern.deleteMany({
      where: { id, userId },
    });
  }
}
