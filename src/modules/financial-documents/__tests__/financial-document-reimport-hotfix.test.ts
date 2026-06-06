import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  FinancialDocumentUploadService,
} from "@/modules/financial-documents/application/services/financial-document-upload.service";
import { UPLOAD_MESSAGES } from "@/modules/financial-documents/domain/constants/financial-document-upload.constants";
import { FinancialDocumentReprocessService } from "@/modules/financial-documents/application/services/financial-document-reprocess.service";
import { buildUploadFingerprint } from "@/modules/financial-documents/domain/services/document-fingerprint.service";

const userId = "user-1";
const buffer = Buffer.from("pix-test-content", "utf8");
const fileName = "comprovante.png";
const mimeType = "image/png";

function uploadInput() {
  return {
    userId,
    fileName,
    mimeType,
    buffer,
    source: "WEB" as const,
  };
}

describe("Hotfix 15.1.1 — reimportação por fingerprint", () => {
  const findByFingerprint = vi.fn();
  const createDocument = vi.fn();
  const updateDocument = vi.fn();
  const auditRecord = vi.fn();

  beforeEach(() => {
    findByFingerprint.mockReset();
    createDocument.mockReset();
    updateDocument.mockReset();
    auditRecord.mockReset();
  });

  function buildUploadService() {
    const service = new FinancialDocumentUploadService({} as never);
    const repo = {
      findDocumentByFingerprint: findByFingerprint,
      createDocument,
      updateDocument,
    };
    const audit = { record: auditRecord };
    (service as unknown as { repo: typeof repo; audit: typeof audit }).repo = repo;
    (service as unknown as { audit: typeof audit }).audit = audit;
    return service;
  }

  it("reimportar documento APPROVED bloqueia", async () => {
    findByFingerprint.mockResolvedValue({
      id: "doc-approved",
      status: "APPROVED",
      extractedJson: {},
    });

    const service = buildUploadService();
    await expect(service.upload(uploadInput())).rejects.toMatchObject({
      code: "DUPLICATE_APPROVED",
      message: UPLOAD_MESSAGES.APPROVED,
    });
    expect(createDocument).not.toHaveBeenCalled();
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it("reimportar documento REVIEW_REQUIRED retorna existente", async () => {
    const existing = {
      id: "doc-review",
      status: "REVIEW_REQUIRED",
      fileName,
    };
    findByFingerprint.mockResolvedValue(existing);

    const service = buildUploadService();
    const result = await service.upload(uploadInput());

    expect(result).toEqual({
      action: "existing_active",
      document: existing,
      message: UPLOAD_MESSAGES.IN_REVIEW,
    });
    expect(updateDocument).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("reimportar documento REJECTED permite recuperação", async () => {
    const existing = {
      id: "doc-rejected",
      status: "REJECTED",
      extractedJson: { processingError: { code: "X" }, archived: true },
    };
    const recovered = { ...existing, status: "UPLOADED" };
    findByFingerprint.mockResolvedValue(existing);
    updateDocument.mockResolvedValue(recovered);

    const service = buildUploadService();
    const result = await service.upload(uploadInput());

    expect(result.action).toBe("recovered");
    if (result.action === "recovered") {
      expect(result.message).toBe(UPLOAD_MESSAGES.REJECTED);
      expect(result.previousStatus).toBe("REJECTED");
    }
    expect(updateDocument).toHaveBeenCalledWith(
      "doc-rejected",
      expect.objectContaining({ status: "UPLOADED" }),
    );
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REOPENED_AFTER_REJECTION",
        documentId: "doc-rejected",
      }),
    );
  });

  it("reimportar documento FAILED permite recuperação", async () => {
    const existing = {
      id: "doc-failed",
      status: "FAILED",
      extractedJson: { processingError: { code: "OCR_EMPTY" } },
    };
    const recovered = { ...existing, status: "UPLOADED" };
    findByFingerprint.mockResolvedValue(existing);
    updateDocument.mockResolvedValue(recovered);

    const service = buildUploadService();
    const result = await service.upload(uploadInput());

    expect(result.action).toBe("recovered");
    if (result.action === "recovered") {
      expect(result.message).toBe(UPLOAD_MESSAGES.FAILED);
      expect(result.previousStatus).toBe("FAILED");
    }
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REOPENED_AFTER_REJECTION" }),
    );
  });

  it("novo arquivo cria documento quando fingerprint não existe", async () => {
    findByFingerprint.mockResolvedValue(null);
    const created = { id: "doc-new", status: "UPLOADED" };
    createDocument.mockResolvedValue(created);

    const service = buildUploadService();
    const result = await service.upload(uploadInput());

    expect(result).toEqual({ action: "created", document: created });
    expect(createDocument).toHaveBeenCalled();
  });
});

describe("Hotfix 15.1.1 — reopen/reprocess sem lançamento", () => {
  const auditRecord = vi.fn();
  const processMock = vi.fn();
  const findDocumentById = vi.fn();
  const updateDocument = vi.fn();
  const updateSuggestion = vi.fn();

  beforeEach(() => {
    auditRecord.mockReset();
    processMock.mockReset();
    findDocumentById.mockReset();
    updateDocument.mockReset();
    updateSuggestion.mockReset();
  });

  function buildReprocessService() {
    const service = new FinancialDocumentReprocessService({} as never);
    const repo = { findDocumentById, updateDocument, updateSuggestion };
    const processing = { process: processMock };
    const audit = { record: auditRecord };
    (service as unknown as { repo: typeof repo; processing: typeof processing; audit: typeof audit }).repo =
      repo;
    (service as unknown as { processing: typeof processing }).processing = processing;
    (service as unknown as { audit: typeof audit }).audit = audit;
    return service;
  }

  it("reopen não cria lançamento e registra auditoria", async () => {
    findDocumentById.mockResolvedValue({
      id: "doc-1",
      status: "REJECTED",
      suggestions: [{ id: "sug-1", status: "REJECTED" }],
    });
    updateDocument.mockResolvedValue({});

    const service = buildReprocessService();
    const result = await service.reopen(userId, "doc-1");

    expect(result?.status).toBe("REVIEW_REQUIRED");
    expect(processMock).not.toHaveBeenCalled();
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REOPENED_AFTER_REJECTION" }),
    );
  });

  it("reprocessamento não invoca criação de Transaction", async () => {
    findDocumentById.mockResolvedValue({
      id: "doc-2",
      status: "FAILED",
      extractedJson: { processingError: { code: "OCR_EMPTY" } },
      suggestions: [{ id: "sug-2", status: "PENDING" }],
    });
    updateDocument.mockResolvedValue({});
    processMock.mockResolvedValue({
      documentId: "doc-2",
      status: "REVIEW_REQUIRED",
      suggestionId: "sug-2",
    });

    const service = buildReprocessService();
    const result = await service.reprocess(userId, "doc-2");

    expect(result?.status).toBe("REVIEW_REQUIRED");
    expect(processMock).toHaveBeenCalledWith(userId, "doc-2", undefined);
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REPROCESS_SUCCEEDED" }),
    );
  });

  it("cross-tenant retorna null (404 na rota)", async () => {
    findDocumentById.mockResolvedValue(null);
    const service = buildReprocessService();

    expect(await service.reopen(userId, "doc-x")).toBeNull();
    expect(await service.reprocess(userId, "doc-x")).toBeNull();
  });
});

describe("Hotfix 15.1.1 — fingerprint estável", () => {
  it("mesmo conteúdo gera mesmo fingerprint para deduplicação", () => {
    const fp1 = buildUploadFingerprint(userId, fileName, buffer.length, buffer);
    const fp2 = buildUploadFingerprint(userId, fileName, buffer.length, buffer);
    expect(fp1).toBe(fp2);
  });
});
