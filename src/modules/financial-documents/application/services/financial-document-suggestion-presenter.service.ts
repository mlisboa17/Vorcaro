import type {
  FinancialDocument,
  FinancialDocumentSuggestion,
  PrismaClient,
} from "@prisma/client";
import {
  displayPartyValue,
  readPartiesMetadata,
} from "../../domain/services/financial-parties-metadata.service";
import { readBatchReviewFromJson } from "../../domain/services/financial-document-import-analyzer.service";

type CategoryMap = Map<string, { id: string; name: string; parentCategoryId: string | null }>;

function buildPartiesView(meta: Record<string, unknown>, docJson: Record<string, unknown>) {
  const parties = readPartiesMetadata(meta.parties ?? docJson.parties);
  return {
    payerName: displayPartyValue(parties.payerName),
    payerDocument: displayPartyValue(parties.payerDocument),
    payerBank: displayPartyValue(parties.payerBank),
    receiverName: displayPartyValue(parties.receiverName),
    receiverDocument: displayPartyValue(parties.receiverDocument),
    receiverBank: displayPartyValue(parties.receiverBank),
    pixKey: displayPartyValue(parties.pixKey),
    transactionIdentifier: displayPartyValue(parties.transactionIdentifier),
  };
}

function categoryLabel(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
  categories: CategoryMap,
): string | null {
  if (!categoryId && !subcategoryId) return null;
  const root = categoryId ? categories.get(categoryId) : null;
  const sub = subcategoryId ? categories.get(subcategoryId) : null;
  if (root && sub) return `${root.name} → ${sub.name}`;
  if (sub) return sub.name;
  if (root) return root.name;
  return null;
}

function readMetadata(suggestion: FinancialDocumentSuggestion): Record<string, unknown> {
  return typeof suggestion.metadata === "object" && suggestion.metadata
    ? (suggestion.metadata as Record<string, unknown>)
    : {};
}

export async function enrichSuggestions(
  prisma: PrismaClient,
  userId: string,
  items: Array<FinancialDocumentSuggestion & { document: FinancialDocument }>,
) {
  const categories = await prisma.category.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, parentCategoryId: true },
  });
  const categoryMap: CategoryMap = new Map(categories.map((c) => [c.id, c]));

  return items.map((item) => {
    const meta = readMetadata(item);
    const docJson =
      typeof item.document.extractedJson === "object" && item.document.extractedJson
        ? (item.document.extractedJson as Record<string, unknown>)
        : {};

    const parties = buildPartiesView(meta, docJson);

    const batchReview =
      readBatchReviewFromJson(meta.batchReview) ?? readBatchReviewFromJson(docJson.batchReview);

    return {
      ...item,
      amount: item.amount != null ? Number(item.amount) : null,
      suggestedCategoryLabel: categoryLabel(item.categoryId, item.subcategoryId, categoryMap),
      documentId: item.documentId,
      parties,
      batchReview,
      extractedFields: {
        payeeName: meta.payeeName ?? null,
        bank: meta.bank ?? null,
        cpfCnpj: meta.cpfCnpj ?? null,
        pixKey: meta.pixKey ?? null,
        documentNumber: meta.documentNumber ?? null,
      },
      confidenceReasons: Array.isArray(meta.confidenceReasons)
        ? meta.confidenceReasons
        : Array.isArray(docJson.confidenceReasons)
          ? docJson.confidenceReasons
          : [],
      requiresMandatoryReview: meta.requiresMandatoryReview === true || item.confidence < 70,
      ocrText: item.document.extractedText ?? null,
      documentStatus: item.document.status,
      fileName: item.document.fileName,
    };
  });
}

export async function enrichDocumentsHistory(
  prisma: PrismaClient,
  userId: string,
  documents: Array<FinancialDocument & { suggestions: FinancialDocumentSuggestion[] }>,
) {
  const categories = await prisma.category.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, parentCategoryId: true },
  });
  const categoryMap: CategoryMap = new Map(categories.map((c) => [c.id, c]));

  return documents.map((doc) => {
    const suggestion = doc.suggestions[0];
    const meta = suggestion ? readMetadata(suggestion) : {};
    const finalCategoryId =
      typeof meta.finalCategoryId === "string" ? meta.finalCategoryId : suggestion?.categoryId;
    const finalSubcategoryId =
      typeof meta.finalSubcategoryId === "string"
        ? meta.finalSubcategoryId
        : suggestion?.subcategoryId;

    const docJson =
      typeof doc.extractedJson === "object" && doc.extractedJson
        ? (doc.extractedJson as Record<string, unknown>)
        : {};
    const parties = buildPartiesView(meta, docJson);
    const archived = docJson.archived === true;

    return {
      id: doc.id,
      fileName: doc.fileName,
      status: doc.status,
      method: doc.method,
      createdAt: doc.createdAt,
      confidence: suggestion?.confidence ?? null,
      parties,
      archived,
      suggestedCategoryLabel: suggestion
        ? categoryLabel(suggestion.categoryId, suggestion.subcategoryId, categoryMap)
        : null,
      finalCategoryLabel: suggestion
        ? categoryLabel(finalCategoryId, finalSubcategoryId, categoryMap)
        : null,
      learningApplied: suggestion?.isLearnedPattern ?? false,
      suggestionStatus: suggestion?.status ?? null,
      processingError:
        typeof doc.extractedJson === "object" &&
        doc.extractedJson &&
        typeof (doc.extractedJson as { processingError?: { message?: string } }).processingError
          ?.message === "string"
          ? (doc.extractedJson as { processingError: { message: string } }).processingError.message
          : null,
    };
  });
}
