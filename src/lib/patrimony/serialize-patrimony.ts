import type {
  AccountingImpact,
  PatrimonyAssetRecord,
  PatrimonyLiabilityRecord,
  PatrimonySummary,
  PatrimonyTransactionRecord,
} from "@/modules/patrimony/domain/ports/patrimony.port";
import { normalizeAssetTypeForApi, normalizeLiabilityTypeForApi } from "@/modules/patrimony/domain/mappers/asset-type.mapper";

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function serializePatrimonyAsset(
  record: PatrimonyAssetRecord,
  liability?: PatrimonyLiabilityRecord | null,
) {
  const saldoDevedor = liability?.saldoAtual ?? 0;
  return {
    id: record.id,
    nome: record.nome,
    descricao: record.descricao,
    tipo: normalizeAssetTypeForApi(record.tipo),
    valorAquisicao: record.valorAquisicao,
    valorAtual: record.valorAtual,
    dataAquisicao: record.dataAquisicao ? formatDateOnly(record.dataAquisicao) : null,
    estaAtivo: record.estaAtivo,
    observacoes: record.observacoes,
    liabilityId: record.linkedLiabilityId,
    linkedLiabilityId: record.linkedLiabilityId,
    patrimonioLiquidoDoBem: record.valorAtual - saldoDevedor,
    liability: liability
      ? {
          id: liability.id,
          nome: liability.nome,
          saldoAtual: liability.saldoAtual,
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function serializePatrimonyLiability(record: PatrimonyLiabilityRecord) {
  return {
    id: record.id,
    nome: record.nome,
    descricao: record.descricao,
    tipo: normalizeLiabilityTypeForApi(record.tipo),
    saldoOriginal: record.saldoOriginal,
    saldoAtual: record.saldoAtual,
    taxaJuros: record.taxaJuros,
    dataContratacao: record.dataContratacao ? formatDateOnly(record.dataContratacao) : null,
    dataQuitacaoPrevista: record.dataQuitacaoPrevista
      ? formatDateOnly(record.dataQuitacaoPrevista)
      : null,
    estaAtivo: record.estaAtivo,
    observacoes: record.observacoes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function serializePatrimonyTransaction(record: PatrimonyTransactionRecord) {
  return {
    id: record.id,
    assetId: record.assetId,
    liabilityId: record.liabilityId,
    tipo: record.tipo,
    valorTotal: record.valorTotal,
    data: formatDateOnly(record.data),
    descricao: record.descricao,
    mainTransactionId: record.mainTransactionId,
    createdAt: record.createdAt.toISOString(),
  };
}

export function serializePatrimonySummary(summary: PatrimonySummary) {
  return {
    totalAtivos: summary.totalAtivos,
    totalPassivos: summary.totalPassivos,
    patrimonioLiquido: summary.patrimonioLiquido,
    contasAReceber: summary.contasAReceber,
    ativosPorTipo: summary.ativosPorTipo,
    passivosPorTipo: summary.passivosPorTipo,
    evolucaoMensal: summary.evolucaoMensal,
  };
}

export function serializeAccountingImpact(impact: AccountingImpact) {
  return impact;
}
