import type { Prisma, PrismaClient } from "@prisma/client";
import type { FinancialDocumentAuditAction } from "@prisma/client";

export type AuditFieldChange = Record<string, { before: unknown; after: unknown }>;

export class FinancialDocumentAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(
    input: {
      userId: string;
      documentId: string;
      suggestionId?: string;
      action: FinancialDocumentAuditAction;
      changedFields?: AuditFieldChange;
    },
  ): Promise<void> {
    await this.prisma.financialDocumentAuditEvent.create({
      data: {
        userId: input.userId,
        documentId: input.documentId,
        suggestionId: input.suggestionId ?? null,
        action: input.action,
        changedFields: (input.changedFields ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  listByDocument(userId: string, documentId: string) {
    return this.prisma.financialDocumentAuditEvent.findMany({
      where: { userId, documentId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export function diffSuggestionFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): AuditFieldChange {
  const changes: AuditFieldChange = {};
  for (const key of keys) {
    const prev = before[key];
    const next = after[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changes[key] = { before: prev ?? null, after: next ?? null };
    }
  }
  return changes;
}
