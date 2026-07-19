import type { Prisma, PrismaClient } from "@prisma/client";
import { PdfParseError } from "@/lib/parsers/pdf-parser";
import { buildDocumentFingerprint } from "../../domain/services/document-fingerprint.service";
import { explainDocumentConfidence } from "../../domain/services/financial-document-confidence.service";
import { analyzeDocumentWithLayoutTraining } from "@/modules/statement-layout-training/application/services/analyze-document-with-layout-training.service";
import { buildPartiesMetadata } from "../../domain/services/financial-parties-metadata.service";
import {
  AUTO_APPROVAL_THRESHOLD,
  MIN_OCR_TEXT_LENGTH,
} from "../../domain/constants/financial-document-review.constants";
import { createFinancialOcrProvider } from "../../infrastructure/ocr/create-financial-ocr-provider";
import { PrismaFinancialDocumentRepository } from "../../infrastructure/repositories/prisma-financial-document.repository";
import {
  FinancialDocumentProcessingError,
  processingErrorUserMessage,
} from "../errors/financial-document-processing.error";
import { FinancialDocumentClassificationService } from "./financial-document-classification.service";
import { FinancialDocumentOcrService } from "./financial-document-ocr.service";
import { FinancialDocumentParserService } from "./financial-document-parser.service";

function readStoredBuffer(extractedJson: unknown): Buffer | null {
  if (!extractedJson || typeof extractedJson !== "object") return null;
  const storage = (extractedJson as { _storage?: { base64?: string } })._storage;
  if (!storage?.base64) return null;
  return Buffer.from(storage.base64, "base64");
}

export type ProcessDocumentOptions = {
  pdfPassword?: string;
};

export type ProcessDocumentResult =
  | {
      documentId: string;
      status: "REVIEW_REQUIRED";
      suggestionId: string;
      parsed: ReturnType<FinancialDocumentParserService["parseText"]>;
      classification: Awaited<ReturnType<FinancialDocumentClassificationService["classify"]>>;
      confidenceExplanation: ReturnType<typeof explainDocumentConfidence>;
      categoryOptions: Awaited<ReturnType<FinancialDocumentClassificationService["classifyTop3"]>>["options"];
      payeeName: string | null;
    }
  | { documentId: string; status: "FAILED"; reason: string; code?: string }
  | { documentId: string; status: "PASSWORD_REQUIRED"; message: string }
  | { documentId: string; status: "DUPLICATE_SEMANTIC"; reason: "DUPLICATE_SEMANTIC" };

export class FinancialDocumentProcessingService {
  private readonly repo: PrismaFinancialDocumentRepository;
  private readonly ocr: FinancialDocumentOcrService;
  private readonly parser: FinancialDocumentParserService;
  private readonly classification: FinancialDocumentClassificationService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialDocumentRepository(prisma);
    this.ocr = new FinancialDocumentOcrService(createFinancialOcrProvider());
    this.parser = new FinancialDocumentParserService();
    this.classification = new FinancialDocumentClassificationService(prisma);
  }

  async process(
    userId: string,
    documentId: string,
    options?: ProcessDocumentOptions,
  ): Promise<ProcessDocumentResult> {
    const document = await this.repo.findDocumentById(userId, documentId);
    if (!document) {
      throw new FinancialDocumentProcessingError("INSUFFICIENT_EXTRACTION", "Documento não encontrado");
    }

    await this.repo.updateDocument(documentId, { status: "PROCESSING" });

    try {
      const buffer = readStoredBuffer(document.extractedJson);
      if (!buffer || buffer.length === 0) {
        await this.failDocument(documentId, document.extractedJson, "CORRUPT_FILE");
        return {
          documentId,
          status: "FAILED",
          reason: processingErrorUserMessage("CORRUPT_FILE"),
          code: "CORRUPT_FILE",
        };
      }

      let ocrResult: { text: string; raw?: unknown };
      try {
        ocrResult = await this.ocr.extract(buffer, document.mimeType, options?.pdfPassword);
      } catch (error) {
        if (error instanceof PdfParseError) {
          if (error.code === "PDF_PASSWORD_REQUIRED") {
            await this.repo.updateDocument(documentId, {
              status: "PASSWORD_REQUIRED",
              extractedJson: {
                ...(typeof document.extractedJson === "object" && document.extractedJson
                  ? (document.extractedJson as Record<string, unknown>)
                  : {}),
                processingError: { code: error.code, message: error.message },
              } as Prisma.InputJsonValue,
            });
            return {
              documentId,
              status: "PASSWORD_REQUIRED",
              message:
                "Este documento está protegido por senha. Informe a senha para continuar o processamento.",
            };
          }
          if (error.code === "PDF_INVALID_PASSWORD") {
            await this.repo.updateDocument(documentId, { status: "PASSWORD_REQUIRED" });
            throw new FinancialDocumentProcessingError("PDF_INVALID_PASSWORD");
          }
          await this.failDocument(documentId, document.extractedJson, "CORRUPT_FILE", undefined, undefined, error.message);
          return {
            documentId,
            status: "FAILED",
            reason: processingErrorUserMessage("CORRUPT_FILE"),
            code: "CORRUPT_FILE",
          };
        }
        throw error;
      }

      const trimmedText = ocrResult.text.trim();
      if (trimmedText.length < MIN_OCR_TEXT_LENGTH) {
        await this.failDocument(documentId, document.extractedJson, "OCR_EMPTY", ocrResult.text, ocrResult.raw);
        return {
          documentId,
          status: "FAILED",
          reason: processingErrorUserMessage("OCR_EMPTY"),
          code: "OCR_EMPTY",
        };
      }

      const batchReview = await analyzeDocumentWithLayoutTraining(this.prisma, {
        userId,
        text: trimmedText,
        fileName: document.fileName,
      });

      if (batchReview.batchReviewRequired && batchReview.bankStatementTransactions.length > 0) {
        const firstLine = batchReview.bankStatementTransactions[0]!;
        const avgConfidence =
          batchReview.bankStatementTransactions.reduce((sum, line) => sum + line.confidence, 0) /
          batchReview.bankStatementTransactions.length;

        await this.repo.updateDocument(documentId, {
          status: "REVIEW_REQUIRED",
          method: batchReview.documentKind === "BANK_STATEMENT" ? "TRANSFERENCIA" : "CARTAO_CREDITO",
          extractedText: ocrResult.text,
          extractedJson: {
            ...(typeof document.extractedJson === "object" && document.extractedJson
              ? (document.extractedJson as Record<string, unknown>)
              : {}),
            ocr: ocrResult.raw as Prisma.InputJsonValue,
            batchReview,
          } as Prisma.InputJsonValue,
        });

        const suggestionPayload = {
          amount: firstLine.amount,
          date: new Date(`${firstLine.date}T12:00:00.000Z`),
          description:
            batchReview.documentKind === "BANK_STATEMENT"
              ? `Extrato — ${batchReview.bankStatementTransactions.length} lançamentos`
              : `Fatura — ${batchReview.bankStatementTransactions.length} compras`,
          supplier: batchReview.documentKind === "BANK_STATEMENT" ? "Extrato bancário" : "Fatura cartão",
          method: batchReview.documentKind === "BANK_STATEMENT" ? ("TRANSFERENCIA" as const) : ("CARTAO_CREDITO" as const),
          categoryId: null,
          subcategoryId: null,
          confidence: Math.round(avgConfidence),
          isLearnedPattern: false,
          metadata: {
            batchReview,
            requiresMandatoryReview: true,
            confidenceReasons: [
              batchReview.documentKind === "BANK_STATEMENT"
                ? "Extrato com múltiplos lançamentos — revisão em tabela obrigatória"
                : "Fatura com múltiplas compras — revisão em tabela obrigatória",
            ],
          },
        };

        const existingSuggestion = document.suggestions[0];
        const suggestion =
          existingSuggestion && existingSuggestion.status !== "APPROVED"
            ? await this.repo.updateSuggestion(existingSuggestion.id, {
                ...suggestionPayload,
                status: "PENDING",
              })
            : await this.repo.createSuggestion({
                userId,
                documentId,
                ...suggestionPayload,
              });

        const parsed = this.parser.parseText(trimmedText);
        const classification = await this.classification.classify(userId, parsed);
        const confidenceExplanation = explainDocumentConfidence({
          confidence: suggestionPayload.confidence,
          classification,
          parsed,
          threshold: AUTO_APPROVAL_THRESHOLD,
        });

        return {
          documentId,
          status: "REVIEW_REQUIRED",
          suggestionId: suggestion.id,
          parsed,
          classification,
          confidenceExplanation,
          categoryOptions: [],
          payeeName: null,
        };
      }

      const parsed = this.parser.parseText(ocrResult.text);

      if (
        parsed.fields.amount == null &&
        !parsed.fields.supplier &&
        !parsed.fields.payeeName &&
        !parsed.fields.receiverName &&
        !parsed.fields.payerName
      ) {
        await this.failDocument(
          documentId,
          document.extractedJson,
          "INSUFFICIENT_EXTRACTION",
          ocrResult.text,
          ocrResult.raw,
        );
        return {
          documentId,
          status: "FAILED",
          reason: processingErrorUserMessage("INSUFFICIENT_EXTRACTION"),
          code: "INSUFFICIENT_EXTRACTION",
        };
      }

      const semanticFingerprint = buildDocumentFingerprint({
        userId,
        method: parsed.method,
        amount: parsed.fields.amount,
        date: parsed.fields.date,
        documentNumber: parsed.fields.documentNumber,
        pixKey: parsed.fields.pixKey,
        barcode: parsed.fields.barcode,
        bank: parsed.fields.bank,
        supplier: parsed.fields.supplier,
      });

      const duplicate = await this.repo.findDocumentByFingerprint(userId, semanticFingerprint);
      if (duplicate && duplicate.id !== documentId) {
        await this.repo.updateDocument(documentId, {
          status: "FAILED",
          extractedText: ocrResult.text,
          extractedJson: {
            ...(typeof document.extractedJson === "object" && document.extractedJson
              ? (document.extractedJson as Record<string, unknown>)
              : {}),
            duplicateOf: duplicate.id,
            parsed: parsed.rawMatches,
          } as Prisma.InputJsonValue,
        });
        return { documentId, status: "DUPLICATE_SEMANTIC", reason: "DUPLICATE_SEMANTIC" };
      }

      const top3 = await this.classification.classifyTop3(userId, parsed);
      const classification = top3.best;
      const confidenceExplanation = explainDocumentConfidence({
        confidence: classification.confidence,
        classification,
        parsed,
        threshold: AUTO_APPROVAL_THRESHOLD,
      });
      const parties = buildPartiesMetadata(parsed.fields);
      const resolvedPayeeName = parties.receiverName?.trim() || top3.aiPayeeName || null;

      await this.repo.updateDocument(documentId, {
        status: "REVIEW_REQUIRED",
        method: parsed.method,
        fingerprint: semanticFingerprint,
        extractedText: ocrResult.text,
        extractedJson: {
          ...(typeof document.extractedJson === "object" && document.extractedJson
            ? (document.extractedJson as Record<string, unknown>)
            : {}),
          ocr: ocrResult.raw as Prisma.InputJsonValue,
          parsed: parsed.rawMatches,
          parties,
          classificationSource: classification.source,
          confidenceReasons: confidenceExplanation.reasons,
        } as Prisma.InputJsonValue,
      });

      // Se a classificação por regra/histórico não resolveu categoria, usa a
      // primeira das 3 opções sugeridas pela IA como categoria principal.
      const primaryCategory =
        classification.categoryId != null
          ? { categoryId: classification.categoryId, subcategoryId: classification.subcategoryId }
          : top3.options[0]
            ? { categoryId: top3.options[0].categoryId, subcategoryId: top3.options[0].subcategoryId }
            : { categoryId: null, subcategoryId: null };

      const suggestionPayload = {
        amount: parsed.fields.amount ?? null,
        date: parsed.fields.date ?? null,
        description: parsed.fields.description ?? parsed.fields.supplier ?? document.fileName,
        supplier: resolvedPayeeName ?? parsed.fields.supplier ?? null,
        method: parsed.method,
        categoryId: primaryCategory.categoryId,
        subcategoryId: primaryCategory.subcategoryId,
        confidence: classification.confidence,
        isLearnedPattern: classification.isLearnedPattern,
        metadata: {
          pixKey: parties.pixKey ?? parsed.fields.pixKey,
          documentNumber: parties.transactionIdentifier ?? parsed.fields.documentNumber,
          cpfCnpj: parties.receiverDocument ?? parsed.fields.cpfCnpj,
          bank: parties.receiverBank ?? parsed.fields.bank,
          payeeName: resolvedPayeeName,
          payerName: parties.payerName,
          parties,
          classificationSource: classification.source,
          confidenceReasons: confidenceExplanation.reasons,
          requiresMandatoryReview: confidenceExplanation.requiresMandatoryReview,
          categoryOptions: top3.options,
        },
      };

      const existingSuggestion = document.suggestions[0];
      let suggestion;
      if (existingSuggestion && existingSuggestion.status !== "APPROVED") {
        suggestion = await this.repo.updateSuggestion(existingSuggestion.id, {
          ...suggestionPayload,
          status: "PENDING",
        });
      } else {
        suggestion = await this.repo.createSuggestion({
          userId,
          documentId,
          ...suggestionPayload,
        });
      }

      return {
        documentId,
        status: "REVIEW_REQUIRED",
        suggestionId: suggestion.id,
        parsed,
        classification: { ...classification, ...primaryCategory },
        confidenceExplanation,
        categoryOptions: top3.options,
        payeeName: resolvedPayeeName,
      };
    } catch (error) {
      if (error instanceof FinancialDocumentProcessingError) {
        if (error.code === "PDF_INVALID_PASSWORD") {
          throw error;
        }
        const failCode =
          error.code === "OCR_EMPTY" ||
          error.code === "CORRUPT_FILE" ||
          error.code === "INSUFFICIENT_EXTRACTION"
            ? error.code
            : "INSUFFICIENT_EXTRACTION";
        await this.failDocument(documentId, document.extractedJson, failCode, undefined, undefined, error.message);
        return {
          documentId,
          status: "FAILED",
          reason: error.message,
          code: error.code,
        };
      }
      await this.repo.updateDocument(documentId, { status: "FAILED" });
      throw error;
    }
  }

  private async failDocument(
    documentId: string,
    extractedJson: unknown,
    code: "OCR_EMPTY" | "CORRUPT_FILE" | "INSUFFICIENT_EXTRACTION",
    extractedText?: string,
    ocrRaw?: unknown,
    message?: string,
  ) {
    await this.repo.updateDocument(documentId, {
      status: "FAILED",
      ...(extractedText ? { extractedText } : {}),
      extractedJson: {
        ...(typeof extractedJson === "object" && extractedJson ? (extractedJson as Record<string, unknown>) : {}),
        processingError: {
          code,
          message: message ?? processingErrorUserMessage(code),
        },
        ...(ocrRaw ? { ocr: ocrRaw as Prisma.InputJsonValue } : {}),
      } as Prisma.InputJsonValue,
    });
  }
}
