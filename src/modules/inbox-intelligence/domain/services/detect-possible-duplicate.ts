import { normalizeInstallmentBaseDescription } from "@/lib/financial/installment-structural-parser";
import { normalizeMerchantText } from "./merchant-similarity";

export type DuplicateCandidate = {
  id: string;
  description: string;
  amount: number | null;
  date?: string | null;
  cardId?: string | null;
  importHash?: string | null;
  externalId?: string | null;
};

export type DuplicateDetectionResult = {
  possibleDuplicate: boolean;
  duplicateReason: string | null;
  duplicateConfidence: number;
};

function normalizeAmount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function sameAmount(left: number | null, right: number | null): boolean {
  if (left == null || right == null) return false;
  return Math.abs(left - right) < 0.01;
}

export function detectPossibleDuplicate(input: {
  description: string;
  rawContent?: string;
  amount?: number | null;
  date?: string | null;
  cardId?: string | null;
  importHash?: string | null;
  externalId?: string | null;
  candidates: DuplicateCandidate[];
  excludeId?: string;
}): DuplicateDetectionResult {
  const description = normalizeInstallmentBaseDescription(
    (input.description || input.rawContent || "").trim(),
  );
  const merchant = normalizeMerchantText(description);
  const amount = normalizeAmount(input.amount ?? null);
  const date = input.date ?? null;

  if (!description && amount == null) {
    return { possibleDuplicate: false, duplicateReason: null, duplicateConfidence: 0 };
  }

  for (const candidate of input.candidates) {
    if (input.excludeId && candidate.id === input.excludeId) continue;

    if (
      input.externalId &&
      candidate.externalId &&
      input.externalId === candidate.externalId
    ) {
      return {
        possibleDuplicate: true,
        duplicateReason: "Mesmo ID externo (FITID de OFX).",
        duplicateConfidence: 100,
      };
    }

    if (
      input.importHash &&
      candidate.importHash &&
      input.importHash === candidate.importHash
    ) {
      return {
        possibleDuplicate: true,
        duplicateReason: "Mesmo hash de importação (OFX/PDF/Telegram).",
        duplicateConfidence: 98,
      };
    }

    const candidateDesc = normalizeInstallmentBaseDescription(candidate.description);
    const candidateMerchant = normalizeMerchantText(candidateDesc);
    const candidateAmount = normalizeAmount(candidate.amount);

    const sameCard =
      !input.cardId || !candidate.cardId || input.cardId === candidate.cardId;
    const sameDate = !date || !candidate.date || date === candidate.date;

    if (
      merchant.length >= 4 &&
      candidateMerchant.length >= 4 &&
      merchant === candidateMerchant &&
      sameAmount(amount, candidateAmount) &&
      sameCard &&
      sameDate
    ) {
      return {
        possibleDuplicate: true,
        duplicateReason: "Descrição e valor iguais a outro lançamento recente.",
        duplicateConfidence: 92,
      };
    }

    if (
      sameAmount(amount, candidateAmount) &&
      sameDate &&
      sameCard &&
      amount != null &&
      description.length > 0 &&
      candidateDesc.toLowerCase() === description.toLowerCase()
    ) {
      return {
        possibleDuplicate: true,
        duplicateReason: "Lançamento com mesma data, valor e descrição.",
        duplicateConfidence: 88,
      };
    }
  }

  return { possibleDuplicate: false, duplicateReason: null, duplicateConfidence: 0 };
}
