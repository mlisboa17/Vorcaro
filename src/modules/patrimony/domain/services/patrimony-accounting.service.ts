import type { AssetType, PatrimonyTxType } from "@prisma/client";
import type { AccountingImpact } from "../ports/patrimony.port";
import {
  isConsortiumAssetType,
  isInvestmentAssetType,
  isValuationAssetType,
} from "../mappers/asset-type.mapper";

function impact(
  caixa: number,
  dre: number,
  patrimonioBruto: number,
  passivo: number,
): AccountingImpact {
  return {
    caixa,
    dre,
    patrimonioBruto,
    passivo,
    patrimonioLiquido: patrimonioBruto - passivo,
  };
}

export function calculateInvestmentImpact(
  tipo: Extract<PatrimonyTxType, "APORTE" | "RESGATE" | "RENDIMENTO">,
  valor: number,
): AccountingImpact {
  if (valor <= 0) {
    throw new Error("Valor deve ser positivo.");
  }

  switch (tipo) {
    case "APORTE":
      return impact(-valor, 0, valor, 0);
    case "RESGATE":
      return impact(valor, 0, -valor, 0);
    case "RENDIMENTO":
      return impact(0, valor, valor, 0);
    default:
      throw new Error(`Tipo de investimento inválido: ${tipo}`);
  }
}

export function calculateFinancingPaymentImpact(input: {
  amortizacao: number;
  juros: number;
  seguro: number;
  taxa: number;
}): AccountingImpact {
  const { amortizacao, juros, seguro, taxa } = input;
  const totalParcela = amortizacao + juros + seguro + taxa;

  if (totalParcela <= 0) {
    throw new Error("Valor total da parcela deve ser positivo.");
  }

  const dreDespesa = -(juros + seguro + taxa);

  return impact(-totalParcela, dreDespesa, 0, -amortizacao);
}

export function calculateConsortiumParcelImpact(input: {
  fundoComum: number;
  taxaAdministracao: number;
  fundoReserva?: number;
}): AccountingImpact {
  const fundoReserva = input.fundoReserva ?? 0;
  const totalCaixa = input.fundoComum + input.taxaAdministracao + fundoReserva;

  if (totalCaixa <= 0) {
    throw new Error("Valor total da parcela deve ser positivo.");
  }

  const dreDespesa = -(input.taxaAdministracao + fundoReserva);

  return impact(-totalCaixa, dreDespesa, input.fundoComum, 0);
}

export function calculateAssetValuationImpact(
  tipo: Extract<PatrimonyTxType, "CORRECAO" | "DEPRECIACAO">,
  valorAjuste: number,
): AccountingImpact {
  if (valorAjuste === 0) {
    throw new Error("Valor de ajuste não pode ser zero.");
  }

  if (tipo === "CORRECAO" && valorAjuste < 0) {
    throw new Error("Correção deve ser positiva (valorização).");
  }

  if (tipo === "DEPRECIACAO" && valorAjuste > 0) {
    throw new Error("Depreciação deve ser negativa (desvalorização).");
  }

  return impact(0, 0, valorAjuste, 0);
}

export function assertAssetSupportsInvestment(assetType: AssetType): void {
  if (!isInvestmentAssetType(assetType)) {
    throw new Error("Operações de aporte/resgate/rendimento exigem ativo do tipo INVESTMENT.");
  }
}

export function assertAssetSupportsConsortium(assetType: AssetType): void {
  if (!isConsortiumAssetType(assetType)) {
    throw new Error("Operações de consórcio exigem ativo do tipo CONSORTIUM.");
  }
}

export function assertAssetSupportsValuation(assetType: AssetType): void {
  if (!isValuationAssetType(assetType)) {
    throw new Error("Correção/depreciação exige ativo do tipo VEHICLE ou REAL_ESTATE.");
  }
}

export function applyAssetValueDelta(currentValue: number, delta: number): number {
  const next = currentValue + delta;
  if (next < 0) {
    throw new Error("Valor atual do ativo não pode ficar negativo.");
  }
  return next;
}

export function applyLiabilityBalanceDelta(currentBalance: number, delta: number): number {
  const next = currentBalance + delta;
  if (next < 0) {
    throw new Error("Saldo do passivo não pode ficar negativo.");
  }
  return next;
}
