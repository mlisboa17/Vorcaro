import type { PrismaClient } from "@prisma/client";

import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";

import { AUTO_APPROVAL_THRESHOLD } from "../../domain/constants/financial-document-review.constants";
import {
  buildPartiesMetadata,
  hasCriticalCounterpartyInfo,
} from "../../domain/services/financial-parties-metadata.service";
import { readBatchReviewFromJson } from "../../domain/services/financial-document-import-analyzer.service";
import type { FinancialDocumentBatchReview } from "../../domain/types/financial-document-import.types";

import { FinancialDocumentUploadError } from "@/modules/financial-documents/application/services/financial-document-upload.service";
import { ALLOWED_DOCUMENT_MIMES } from "@/modules/financial-documents/domain/types/financial-document.types";

import {

  formatTelegramDocumentSummary,

  TELEGRAM_DOCUMENT_RECEIVED,

  TELEGRAM_PASSWORD_REQUIRED,
  TELEGRAM_REVIEW_REQUIRED,
  formatTelegramInstallmentBatchSummary,
} from "./telegram-document-summary.formatter";



export type TelegramDocumentInput = {

  userId: string;

  fileName: string;

  mimeType: string;

  buffer: Buffer;

};



export type TelegramDocumentProcessResult = {
  summary: string;
  suggestionId?: string;
  documentId: string;
  confidence?: number;
  immediateAck?: string;
  allowInlineApproval?: boolean;
};



async function resolveCategoryLabel(

  prisma: PrismaClient,

  userId: string,

  categoryId: string | null,

  subcategoryId: string | null,

): Promise<string | null> {

  if (!categoryId && !subcategoryId) return null;

  const ids = [categoryId, subcategoryId].filter(Boolean) as string[];

  const categories = await prisma.category.findMany({

    where: { userId, id: { in: ids } },

    select: { id: true, name: true },

  });

  const byId = new Map(categories.map((c) => [c.id, c.name]));

  const root = categoryId ? byId.get(categoryId) : null;

  const sub = subcategoryId ? byId.get(subcategoryId) : null;

  if (root && sub) return `${root} → ${sub}`;

  return sub ?? root ?? null;

}



export class TelegramFinancialDocumentService {

  constructor(private readonly prisma: PrismaClient) {}



  async ingestAndProcess(input: TelegramDocumentInput): Promise<TelegramDocumentProcessResult> {

    const { upload, processing } = buildFinancialDocumentServices(this.prisma);

    const mime = input.mimeType.toLowerCase();



    if (!ALLOWED_DOCUMENT_MIMES.has(mime) && !mime.startsWith("image/")) {

      throw new FinancialDocumentUploadError("Tipo de arquivo não suportado no Telegram", "INVALID_MIME");

    }



    const uploadResult = await upload.upload({

      userId: input.userId,

      fileName: input.fileName,

      mimeType: mime.startsWith("image/") ? mime : input.mimeType,

      buffer: input.buffer,

      source: "TELEGRAM",

    });



    if (uploadResult.action === "existing_active") {

      return {

        documentId: uploadResult.document.id,

        immediateAck: TELEGRAM_DOCUMENT_RECEIVED,

        summary: uploadResult.message,

      };

    }



    const document = uploadResult.document;

    const result = await processing.process(input.userId, document.id);



    if (result.status === "PASSWORD_REQUIRED") {

      return {

        documentId: document.id,

        immediateAck: TELEGRAM_DOCUMENT_RECEIVED,

        summary: TELEGRAM_PASSWORD_REQUIRED,

      };

    }



    if (result.status === "FAILED") {

      return {

        documentId: document.id,

        immediateAck: TELEGRAM_DOCUMENT_RECEIVED,

        summary: result.reason,

      };

    }



    if (result.status === "DUPLICATE_SEMANTIC") {

      return {

        documentId: document.id,

        immediateAck: TELEGRAM_DOCUMENT_RECEIVED,

        summary: "Documento duplicado detectado. Nenhum lançamento será criado.",

      };

    }



    if (!("parsed" in result) || !result.parsed || !result.classification) {

      return {

        documentId: document.id,

        immediateAck: TELEGRAM_DOCUMENT_RECEIVED,

        summary: "Não foi possível extrair informações suficientes. Revise no dashboard.",

      };

    }



    const categoryLabel = await resolveCategoryLabel(
      this.prisma,
      input.userId,
      result.classification.categoryId,
      result.classification.subcategoryId,
    );

    let batchReview: FinancialDocumentBatchReview | null = null;
    if (result.suggestionId) {
      const suggestion = await this.prisma.financialDocumentSuggestion.findFirst({
        where: { id: result.suggestionId, userId: input.userId },
        select: { metadata: true },
      });
      const meta =
        typeof suggestion?.metadata === "object" && suggestion.metadata
          ? (suggestion.metadata as Record<string, unknown>)
          : {};
      batchReview = readBatchReviewFromJson(meta.batchReview);
    }

    if (batchReview?.batchReviewRequired) {
      const installmentSummary =
        batchReview.installmentPurchases && batchReview.installmentPurchases.length > 0
          ? formatTelegramInstallmentBatchSummary(batchReview.installmentPurchases)
          : "Extrato ou fatura com múltiplos lançamentos detectados.\n\nRevise em /dashboard/import/review";

      return {
        documentId: document.id,
        suggestionId: result.suggestionId,
        summary: installmentSummary,
        confidence: result.classification.confidence,
        immediateAck: TELEGRAM_DOCUMENT_RECEIVED,
        allowInlineApproval: false,
      };
    }

    const parties = buildPartiesMetadata(result.parsed.fields);
    const hasCriticalInfo =
      result.parsed.fields.amount != null && hasCriticalCounterpartyInfo(parties);
    const allowInlineApproval =
      hasCriticalInfo && result.classification.confidence >= AUTO_APPROVAL_THRESHOLD;

    const summary = formatTelegramDocumentSummary({
      parsed: result.parsed,
      classification: result.classification,
      categoryLabel,
    });

    return {
      documentId: document.id,
      suggestionId: result.suggestionId,
      summary: allowInlineApproval
        ? summary
        : `${summary}\n\n${TELEGRAM_REVIEW_REQUIRED}`,
      confidence: result.classification.confidence,
      immediateAck: TELEGRAM_DOCUMENT_RECEIVED,
      allowInlineApproval,
    };

  }

}

