import {
  buildStableInstallmentGroupId,
  parseInstallmentStructure,
} from "@/lib/financial/installment-structural-parser";
import type { InstallmentClassificationHint } from "../types/inbox-classification";

export function buildInstallmentClassificationHint(input: {
  userId: string;
  description: string;
  rawContent?: string;
  amount?: number | null;
  cardId?: string | null;
  purchaseDate?: string | null;
}): InstallmentClassificationHint | undefined {
  const sourceText = (input.description || input.rawContent || "").trim();
  if (!sourceText) return undefined;

  const parsed = parseInstallmentStructure(sourceText);
  if (!parsed.hadInstallmentMarker && parsed.totalParcelas <= 1) {
    return undefined;
  }

  const primeiraParcela = input.purchaseDate ?? new Date().toISOString().slice(0, 10);

  const installmentGroup =
    parsed.hadInstallmentMarker && input.amount != null && input.amount > 0
      ? buildStableInstallmentGroupId({
          userId: input.userId,
          cardId: input.cardId ?? null,
          descricaoBase: parsed.descricaoBase,
          valorParcela: input.amount,
          totalParcelas: parsed.totalParcelas,
          primeiraParcelaAproximada: primeiraParcela,
        })
      : null;

  return {
    descricaoBase: parsed.descricaoBase,
    numeroParcela: parsed.numeroParcela,
    totalParcelas: parsed.totalParcelas,
    installmentGroup,
    hadInstallmentMarker: parsed.hadInstallmentMarker,
  };
}
