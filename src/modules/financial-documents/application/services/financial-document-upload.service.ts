import type { FinancialDocument } from "@prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { FinancialDocumentAuditAction } from "@prisma/client";
import {
  isActiveDocumentStatus,
  isRecoverableDocumentStatus,
  UPLOAD_MESSAGES,
} from "../../domain/constants/financial-document-upload.constants";
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_BYTES,
  type DocumentUploadInput,
} from "../../domain/types/financial-document.types";
import { buildUploadFingerprint } from "../../domain/services/document-fingerprint.service";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";
import { FinancialDocumentAuditService } from "./financial-document-audit.service";

export class FinancialDocumentUploadError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_MIME"
      | "FILE_TOO_LARGE"
      | "DUPLICATE"
      | "DUPLICATE_APPROVED",
  ) {
    super(message);
    this.name = "FinancialDocumentUploadError";
  }
}

export type DocumentUploadResult =
  | { action: "created"; document: FinancialDocument }
  | { action: "existing_active"; document: FinancialDocument; message: string }
  | {
      action: "recovered";
      document: FinancialDocument;
      message: string;
      previousStatus: FinancialDocument["status"];
    };

export class FinancialDocumentUploadService {
  private readonly repo: PrismaFinancialDocumentRepository;
  private readonly audit: FinancialDocumentAuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
    this.audit = new FinancialDocumentAuditService(prisma);
  }

  validateMime(mimeType: string): void {
    if (!ALLOWED_DOCUMENT_MIMES.has(mimeType.toLowerCase())) {
      throw new FinancialDocumentUploadError("Tipo de arquivo não suportado", "INVALID_MIME");
    }
  }

  validateSize(size: number): void {
    if (size > MAX_DOCUMENT_BYTES) {
      throw new FinancialDocumentUploadError("Arquivo excede o limite de 10MB", "FILE_TOO_LARGE");
    }
  }

  async upload(input: DocumentUploadInput): Promise<DocumentUploadResult> {
    this.validateMime(input.mimeType);
    this.validateSize(input.buffer.length);

    const fingerprint = buildUploadFingerprint(
      input.userId,
      input.fileName,
      input.buffer.length,
      input.buffer,
    );

    const existing = await this.repo.findDocumentByFingerprint(input.userId, fingerprint);
    if (existing) {
      return this.handleExistingDocument(input, existing, fingerprint);
    }

    const document = await this.createDocument(input, fingerprint);
    return { action: "created", document };
  }

  private async handleExistingDocument(
    input: DocumentUploadInput,
    existing: FinancialDocument,
    fingerprint: string,
  ): Promise<DocumentUploadResult> {
    if (existing.status === "APPROVED") {
      throw new FinancialDocumentUploadError(UPLOAD_MESSAGES.APPROVED, "DUPLICATE_APPROVED");
    }

    if (isActiveDocumentStatus(existing.status)) {
      return {
        action: "existing_active",
        document: existing,
        message: UPLOAD_MESSAGES.IN_REVIEW,
      };
    }

    if (isRecoverableDocumentStatus(existing.status)) {
      const baseJson =
        typeof existing.extractedJson === "object" && existing.extractedJson
          ? { ...(existing.extractedJson as Record<string, unknown>) }
          : {};

      delete baseJson.processingError;
      delete baseJson.duplicateOf;
      delete baseJson.archived;
      delete baseJson.archivedAt;

      const document = await this.repo.updateDocument(existing.id, {
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.buffer.length,
        status: "UPLOADED",
        extractedJson: {
          ...baseJson,
          _storage: {
            base64: input.buffer.toString("base64"),
            source: input.source ?? "WEB",
          },
          recoveredFromStatus: existing.status,
          recoveredAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      });

      await this.audit.record({
        userId: input.userId,
        documentId: existing.id,
        action: "REOPENED_AFTER_REJECTION" as FinancialDocumentAuditAction,
        changedFields: {
          status: { before: existing.status, after: "UPLOADED" },
          reimport: { before: false, after: true },
        },
      });

      const message =
        existing.status === "REJECTED" ? UPLOAD_MESSAGES.REJECTED : UPLOAD_MESSAGES.FAILED;

      return {
        action: "recovered",
        document,
        message,
        previousStatus: existing.status,
      };
    }

    throw new FinancialDocumentUploadError(UPLOAD_MESSAGES.IN_REVIEW, "DUPLICATE");
  }

  private async createDocument(input: DocumentUploadInput, fingerprint: string) {
    const storageKey = `inline/${fingerprint}`;
    return this.repo.createDocument({
      user: { connect: { id: input.userId } },
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.buffer.length,
      storageKey,
      fingerprint,
      status: "UPLOADED",
      extractedJson: {
        _storage: {
          base64: input.buffer.toString("base64"),
          source: input.source ?? "WEB",
        },
      },
    });
  }
}
