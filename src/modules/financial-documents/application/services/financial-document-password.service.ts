import type { FinancialDocumentAuditAction, PrismaClient } from "@prisma/client";
import { FinancialDocumentProcessingError } from "../errors/financial-document-processing.error";
import { FinancialDocumentProcessingService } from "./financial-document-processing.service";
import { FinancialDocumentAuditService } from "./financial-document-audit.service";
import { readPartiesMetadata } from "../../domain/services/financial-parties-metadata.service";

export class FinancialDocumentPasswordService {
  private readonly processing: FinancialDocumentProcessingService;
  private readonly audit: FinancialDocumentAuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.processing = new FinancialDocumentProcessingService(prisma);
    this.audit = new FinancialDocumentAuditService(prisma);
  }

  async submitPassword(userId: string, documentId: string, password: string) {
    const document = await this.prisma.financialDocument.findFirst({
      where: { id: documentId, userId },
      include: { suggestions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!document) {
      throw new FinancialDocumentProcessingError("INSUFFICIENT_EXTRACTION", "Documento não encontrado");
    }

    if (document.status !== "PASSWORD_REQUIRED") {
      throw new FinancialDocumentProcessingError(
        "INSUFFICIENT_EXTRACTION",
        "Documento não aguarda senha",
      );
    }

    if (!password.trim()) {
      throw new FinancialDocumentProcessingError("PDF_INVALID_PASSWORD", "Informe a senha do PDF.");
    }

    await this.audit.record({
      userId,
      documentId,
      suggestionId: document.suggestions[0]?.id,
      action: "PASSWORD_SUBMITTED" as FinancialDocumentAuditAction,
    });

    try {
      return await this.processing.process(userId, documentId, { pdfPassword: password });
    } catch (error) {
      if (error instanceof FinancialDocumentProcessingError && error.code === "PDF_INVALID_PASSWORD") {
        throw error;
      }
      throw error;
    }
  }
}
