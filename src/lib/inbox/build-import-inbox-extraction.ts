import type { FinancialExtraction } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import {
  parseInboxImportLineMetadata,
  type InboxImportLineMetadata,
} from "@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema";
import { resolveInboxInstallment } from "@/lib/financial/resolve-inbox-installment";

type InboxItemForExtraction = {
  id: string;
  userId: string;
  rawContent: string;
  metadata: unknown;
};

function emptyConfidence(): Record<string, number> {
  return {
    type: 1,
    amount: 1,
    description: 1,
    category: 1,
    date: 1,
    paymentMethod: 1,
    installments: 1,
  };
}

export function buildExtractionFromImportInbox(
  item: InboxItemForExtraction,
  meta: InboxImportLineMetadata,
): FinancialExtraction & {
  currentInstallment?: number;
  totalInstallments?: number;
  installmentGroup?: string | null;
  descricaoBase?: string | null;
  dataCompra?: string | null;
  dataCaixa?: string | null;
  dataVencimentoFatura?: string | null;
} {
  const description = meta.description ?? item.rawContent;
  const amount = typeof meta.amount === "number" ? meta.amount : null;
  const installmentResolved =
    amount != null && amount > 0
      ? resolveInboxInstallment({
          userId: item.userId,
          description,
          rawContent: item.rawContent,
          amount,
          cardId: meta.cartaoId ?? null,
          purchaseDate: meta.date ?? null,
          dataCompra: meta.dataCompra ?? meta.date ?? null,
          dataCaixa: meta.dataCaixa ?? null,
          dataVencimentoFatura: meta.dataVencimentoFatura ?? null,
          existingInstallmentGroup: meta.installmentGroup ?? null,
          existingNumeroParcela: meta.installment ?? null,
          existingTotalParcelas: meta.totalInstallments ?? null,
          existingDescricaoBase: meta.descricaoBase ?? null,
        })
      : null;

  const extraction: FinancialExtraction & {
    currentInstallment?: number;
    totalInstallments?: number;
    installmentGroup?: string | null;
    descricaoBase?: string | null;
    dataCompra?: string | null;
    dataCaixa?: string | null;
    dataVencimentoFatura?: string | null;
  } = {
    type: "EXPENSE",
    amount,
    description: installmentResolved?.descricaoBase ?? description,
    category: meta.suggestedCategoryName ?? null,
    categoriaPrincipal: null,
    subcategoria: null,
    date: meta.date ?? meta.dataCompra ?? null,
    paymentMethod: null,
    paymentMethodType: meta.cartaoId ? "CARTAO_CREDITO" : null,
    financialInstitution: null,
    cardLastFourDigits: null,
    cardBrand: null,
    installments: installmentResolved?.totalParcelas ?? 1,
    confidence: emptyConfidence(),
    missingFields: amount == null ? ["amount"] : [],
    followUpQuestion: null,
    financialAccountId: meta.contaFinanceiraId ?? null,
    paymentMethodId: null,
    cardId: meta.cartaoId ?? null,
    categoryId: meta.suggestedCategoryId ?? null,
    currentInstallment: installmentResolved?.numeroParcela,
    totalInstallments: installmentResolved?.totalParcelas,
    installmentGroup: installmentResolved?.installmentGroup ?? null,
    descricaoBase: installmentResolved?.descricaoBase ?? null,
    dataCompra: installmentResolved?.dataCompra ?? meta.dataCompra ?? meta.date ?? null,
    dataCaixa: installmentResolved?.dataCaixa ?? meta.dataCaixa ?? null,
    dataVencimentoFatura:
      installmentResolved?.dataVencimentoFatura ?? meta.dataVencimentoFatura ?? null,
  };

  return extraction;
}

export function parseImportMetadataForItem(metadata: unknown): InboxImportLineMetadata | null {
  return parseInboxImportLineMetadata(metadata);
}
