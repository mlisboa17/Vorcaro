import type { Consortium, PatrimonyAsset } from "@prisma/client";
import type { ConsortiumDto } from "@/types/consortium";
import {
  computePaidPercent,
  computeParcelValue,
  computeSaldoRestante,
  decimalToNumber,
} from "./consortium-domain";

type ConsortiumWithAsset = Consortium & { asset?: PatrimonyAsset | null };

function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function serializeConsortium(record: ConsortiumWithAsset): ConsortiumDto {
  const valorParcela = computeParcelValue(record);

  return {
    id: record.id,
    nome: record.nome,
    tipo: record.tipo,
    status: record.status,
    valorCredito: decimalToNumber(record.valorCredito),
    valorLance: decimalToNumber(record.valorLance),
    valorPago: decimalToNumber(record.valorPago),
    valorTaxas: decimalToNumber(record.valorTaxas),
    quantidadeParcelas: record.quantidadeParcelas,
    parcelasPagas: record.parcelasPagas,
    valorParcela,
    saldoRestante: computeSaldoRestante(record),
    percentualPago: computePaidPercent(record),
    dataContratacao: formatDateOnly(record.dataContratacao),
    dataContemplacao: formatDateOnly(record.dataContemplacao),
    dataQuitacao: formatDateOnly(record.dataQuitacao),
    assetId: record.assetId,
    assetNome: record.asset?.nome ?? null,
    lancamentoRecorrenteId: record.lancamentoRecorrenteId,
    estaAtivo: record.estaAtivo,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function buildConsortiumSummary(items: ConsortiumDto[]) {
  const active = items.filter((item) => item.estaAtivo);
  const contemplados = active.filter(
    (item) =>
      item.status === "CONTEMPLATED" ||
      item.status === "ASSET_ACQUIRED" ||
      item.status === "COMPLETED",
  ).length;

  return {
    quantidade: active.length,
    creditoTotal: active.reduce((sum, item) => sum + item.valorCredito, 0),
    valorPago: active.reduce((sum, item) => sum + item.valorPago, 0),
    saldoRestante: active.reduce((sum, item) => sum + item.saldoRestante, 0),
    contemplados,
  };
}
