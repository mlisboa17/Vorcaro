import type { FinancialDocumentAuditAction, Prisma, PrismaClient } from "@prisma/client";
import { FinancialDocumentProcessingError } from "../errors/financial-document-processing.error";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";
import { FinancialDocumentAuditService } from "./financial-document-audit.service";
import { FinancialDocumentProcessingService } from "./financial-document-processing.service";

export class FinancialDocumentReprocessService {
  private readonly repo: PrismaFinancialDocumentRepository;
  private readonly processing: FinancialDocumentProcessingService;
  private readonly audit: FinancialDocumentAuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
    this.processing = new FinancialDocumentProcessingService(prisma);
    this.audit = new FinancialDocumentAuditService(prisma);
  }

  async reprocess(userId: string, documentId: string, options?: { pdfPassword?: string }) {
    const document = await this.repo.findDocumentById(userId, documentId);
    if (!document) {
      return null;
    }

    if (document.status === "APPROVED") {
      throw new FinancialDocumentProcessingError(
        "INSUFFICIENT_EXTRACTION",
        "Documento já aprovado não pode ser reprocessado.",
      );
    }

    const latestSuggestion = document.suggestions[0];
    if (latestSuggestion?.status === "APPROVED") {
      throw new FinancialDocumentProcessingError(
        "INSUFFICIENT_EXTRACTION",
        "Documento com lançamento aprovado não pode ser reprocessado.",
      );
    }

    await this.audit.record({
      userId,
      documentId,
      suggestionId: latestSuggestion?.id,
      action: "REPROCESS_REQUESTED" as FinancialDocumentAuditAction,
    });

    const baseJson =
      typeof document.extractedJson === "object" && document.extractedJson
        ? { ...(document.extractedJson as Record<string, unknown>) }
        : {};
    delete baseJson.processingError;
    delete baseJson.duplicateOf;

    await this.repo.updateDocument(documentId, {
      extractedJson: baseJson as Prisma.InputJsonValue,
    });

    try {
      const result = await this.processing.process(userId, documentId, options);

      if (result.status === "REVIEW_REQUIRED" || result.status === "PASSWORD_REQUIRED") {
        await this.audit.record({
          userId,
          documentId,
          suggestionId: "suggestionId" in result ? result.suggestionId : latestSuggestion?.id,
          action: "REPROCESS_SUCCEEDED" as FinancialDocumentAuditAction,
        });
      } else {
        await this.audit.record({
          userId,
          documentId,
          suggestionId: latestSuggestion?.id,
          action: "REPROCESS_FAILED" as FinancialDocumentAuditAction,
          changedFields: {
            status: { before: document.status, after: result.status },
          },
        });
      }

      return result;
    } catch (error) {
      await this.audit.record({
        userId,
        documentId,
        suggestionId: latestSuggestion?.id,
        action: "REPROCESS_FAILED" as FinancialDocumentAuditAction,
        changedFields: {
          error: { before: null, after: error instanceof Error ? error.message : "unknown" },
        },
      });
      throw error;
    }
  }

  async reopen(userId: string, documentId: string) {
    const document = await this.repo.findDocumentById(userId, documentId);
    if (!document) {
      return null;
    }

    if (document.status !== "REJECTED" && document.status !== "FAILED") {
      throw new FinancialDocumentProcessingError(
        "INSUFFICIENT_EXTRACTION",
        "Somente documentos rejeitados ou falhos podem ser reabertos.",
      );
    }

    const latestSuggestion = document.suggestions[0];
    await this.repo.updateDocument(documentId, { status: "REVIEW_REQUIRED" });

    if (latestSuggestion) {
      await this.repo.updateSuggestion(latestSuggestion.id, { status: "PENDING" });
    }

    await this.audit.record({
      userId,
      documentId,
      suggestionId: latestSuggestion?.id,
      action: "REOPENED_AFTER_REJECTION" as FinancialDocumentAuditAction,
      changedFields: {
        status: { before: document.status, after: "REVIEW_REQUIRED" },
      },
    });

    return { documentId, status: "REVIEW_REQUIRED" as const };
  }

  async archive(userId: string, documentId: string) {
    const document = await this.repo.findDocumentById(userId, documentId);
    if (!document) {
      return null;
    }

    if (document.status !== "REJECTED") {
      throw new FinancialDocumentProcessingError(
        "INSUFFICIENT_EXTRACTION",
        "Somente documentos rejeitados podem ser arquivados.",
      );
    }

    const baseJson =
      typeof document.extractedJson === "object" && document.extractedJson
        ? { ...(document.extractedJson as Record<string, unknown>) }
        : {};

    await this.repo.updateDocument(documentId, {
      extractedJson: {
        ...baseJson,
        archived: true,
        archivedAt: new Date().toISOString(),
      },
    });

    return { documentId, archived: true };
  }
}
