import type { Consortium, ConsortiumStatus } from "@prisma/client";
import type { ExecutiveDashboardAlert } from "@/types/executive-dashboard";

export function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

export function computeParcelValue(consortium: {
  valorCredito: { toNumber(): number };
  valorTaxas: { toNumber(): number };
  quantidadeParcelas: number;
}): number {
  if (consortium.quantidadeParcelas <= 0) {
    return 0;
  }

  const credito = decimalToNumber(consortium.valorCredito);
  const taxas = decimalToNumber(consortium.valorTaxas);
  return (credito + taxas) / consortium.quantidadeParcelas;
}

export function computeSaldoRestante(consortium: {
  valorCredito: { toNumber(): number };
  valorPago: { toNumber(): number };
}): number {
  return decimalToNumber(consortium.valorCredito) - decimalToNumber(consortium.valorPago);
}

export function computePaidPercent(consortium: {
  valorCredito: { toNumber(): number };
  valorPago: { toNumber(): number };
}): number {
  const credito = decimalToNumber(consortium.valorCredito);
  if (credito <= 0) {
    return 0;
  }
  return (decimalToNumber(consortium.valorPago) / credito) * 100;
}

export function addMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
}

export function buildConsortiumParcelDates(
  consortium: Pick<
    Consortium,
    "parcelasPagas" | "quantidadeParcelas" | "dataContratacao" | "createdAt"
  >,
  fromDate: Date,
  untilDate: Date,
): Date[] {
  if (consortium.quantidadeParcelas <= consortium.parcelasPagas) {
    return [];
  }

  const anchor = consortium.dataContratacao ?? consortium.createdAt;
  const startIndex = consortium.parcelasPagas;
  const dates: Date[] = [];

  for (let index = startIndex; index < consortium.quantidadeParcelas; index += 1) {
    const parcelDate = addMonthsUtc(anchor, index);
    if (parcelDate > fromDate && parcelDate <= untilDate) {
      dates.push(parcelDate);
    }
  }

  return dates;
}

export function buildConsortiumAlerts(
  consortiums: Array<
    Pick<Consortium, "id" | "nome" | "status" | "assetId" | "valorCredito" | "valorPago" | "estaAtivo">
  >,
): ExecutiveDashboardAlert[] {
  const alerts: ExecutiveDashboardAlert[] = [];

  for (const item of consortiums.filter((row) => row.estaAtivo && row.status !== "COMPLETED")) {
    if (
      (item.status === "CONTEMPLATED" || item.status === "ASSET_ACQUIRED") &&
      !item.assetId
    ) {
      alerts.push({
        type: "CONSORCIO_SEM_BEM",
        severity: "CRITICAL",
        message: `Consórcio "${item.nome}" contemplado sem bem vinculado.`,
      });
    }

    const percent = computePaidPercent(item);
    const remaining = computeSaldoRestante(item);

    if (percent >= 80 || remaining <= decimalToNumber(item.valorCredito) * 0.2) {
      alerts.push({
        type: "CONSORCIO_PROXIMO_QUITACAO",
        severity: "WARNING",
        message: `Consórcio "${item.nome}" com ${percent.toFixed(0)}% do crédito já pago.`,
      });
    }
  }

  return alerts;
}

export function requiresAssetForStatus(status: ConsortiumStatus): boolean {
  return status === "ASSET_ACQUIRED";
}
