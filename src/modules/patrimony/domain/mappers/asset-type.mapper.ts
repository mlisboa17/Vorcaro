import type { AssetType, LiabilityType } from "@prisma/client";

export function isInvestmentAssetType(tipo: AssetType): boolean {
  return tipo === "INVESTMENT" || tipo === "INVESTIMENTO";
}

export function isConsortiumAssetType(tipo: AssetType): boolean {
  return tipo === "CONSORTIUM" || tipo === "CONSORCIO";
}

export function isValuationAssetType(tipo: AssetType): boolean {
  return (
    tipo === "VEHICLE" ||
    tipo === "REAL_ESTATE" ||
    tipo === "BEM"
  );
}

export function normalizeAssetTypeForApi(tipo: AssetType): AssetType {
  if (tipo === "INVESTIMENTO") return "INVESTMENT";
  if (tipo === "CONSORCIO") return "CONSORTIUM";
  if (tipo === "DIREITO_RECEBER") return "RECEIVABLE";
  return tipo;
}

export function normalizeLiabilityTypeForApi(tipo: LiabilityType): LiabilityType {
  if (tipo === "EMPRESTIMO") return "LOAN";
  if (tipo === "FINANCIAMENTO") return "FINANCING";
  if (tipo === "OBRIGACAO") return "OTHER";
  return tipo;
}
