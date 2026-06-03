import {
  buildStableInstallmentGroupId,
  parseInstallmentStructure,
  type InstallmentStructuralParseResult,
} from "./installment-structural-parser";

export type ResolvedInboxInstallment = InstallmentStructuralParseResult & {
  installmentGroup: string | null;
  valorParcela: number;
  dataVencimentoFatura: string | null;
  dataCompra: string | null;
  dataCaixa: string | null;
};

export type ResolveInboxInstallmentInput = {
  userId: string;
  description: string;
  rawContent?: string | null;
  amount: number;
  cardId?: string | null;
  purchaseDate?: string | null;
  dataCompra?: string | null;
  dataCaixa?: string | null;
  dataVencimentoFatura?: string | null;
  existingInstallmentGroup?: string | null;
  existingNumeroParcela?: number | null;
  existingTotalParcelas?: number | null;
  existingDescricaoBase?: string | null;
};

export function resolveInboxInstallment(
  input: ResolveInboxInstallmentInput,
): ResolvedInboxInstallment {
  const sourceText = (input.description || input.rawContent || "").trim();
  const parsed = parseInstallmentStructure(sourceText);

  const numeroParcela = input.existingNumeroParcela ?? parsed.numeroParcela;
  const totalParcelas = input.existingTotalParcelas ?? parsed.totalParcelas;
  const descricaoBase = input.existingDescricaoBase ?? parsed.descricaoBase;

  const primeiraParcelaAproximada =
    input.dataCompra ??
    input.purchaseDate ??
    input.dataCaixa ??
    input.dataVencimentoFatura ??
    new Date().toISOString().slice(0, 10);

  const installmentGroup =
    input.existingInstallmentGroup ??
    (parsed.hadInstallmentMarker || numeroParcela > 1 || totalParcelas > 1
      ? buildStableInstallmentGroupId({
          userId: input.userId,
          cardId: input.cardId ?? null,
          descricaoBase,
          valorParcela: input.amount,
          totalParcelas,
          primeiraParcelaAproximada,
        })
      : null);

  return {
    ...parsed,
    descricaoBase,
    numeroParcela,
    totalParcelas,
    installmentGroup,
    valorParcela: input.amount,
    dataVencimentoFatura: input.dataVencimentoFatura ?? null,
    dataCompra: input.dataCompra ?? input.purchaseDate ?? null,
    dataCaixa: input.dataCaixa ?? null,
  };
}
