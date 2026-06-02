import type { AssetType, LiabilityType } from "@prisma/client";

export type PatrimonyTab = "visao" | "ativos" | "passivos" | "investimentos" | "consorcios";

export interface PatrimonySummaryDto {
  totalAtivos: number;
  totalPassivos: number;
  patrimonioLiquido: number;
  ativosPorTipo: Record<string, number>;
  passivosPorTipo: Record<string, number>;
  evolucaoMensal: Array<{
    mes: string;
    ativos: number;
    passivos: number;
    patrimonioLiquido: number;
  }>;
}

export interface PatrimonyAssetDto {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: AssetType;
  valorAquisicao: number;
  valorAtual: number;
  dataAquisicao: string | null;
  estaAtivo: boolean;
  observacoes: string | null;
  liabilityId: string | null;
  patrimonioLiquidoDoBem: number;
  liability: { id: string; nome: string; saldoAtual: number } | null;
}

export interface PatrimonyLiabilityDto {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: LiabilityType;
  saldoOriginal: number;
  saldoAtual: number;
  taxaJuros: number | null;
  dataContratacao: string | null;
  dataQuitacaoPrevista: string | null;
  estaAtivo: boolean;
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  VEHICLE: "Veículo",
  REAL_ESTATE: "Imóvel",
  INVESTMENT: "Investimento",
  INVESTIMENTO: "Investimento",
  CONSORTIUM: "Consórcio",
  CONSORCIO: "Consórcio",
  RECEIVABLE: "A receber",
  DIREITO_RECEBER: "A receber",
  OTHER: "Outro",
  BEM: "Bem",
  ADIANTAMENTO: "Adiantamento",
};

export const LIABILITY_TYPE_LABELS: Record<string, string> = {
  FINANCING: "Financiamento",
  FINANCIAMENTO: "Financiamento",
  LOAN: "Empréstimo",
  EMPRESTIMO: "Empréstimo",
  CREDIT_LINE: "Linha de crédito",
  OTHER: "Outro",
  OBRIGACAO: "Obrigação",
};

export const PATRIMONY_TABS: { value: PatrimonyTab; label: string }[] = [
  { value: "visao", label: "Visão Geral" },
  { value: "ativos", label: "Ativos" },
  { value: "passivos", label: "Passivos" },
  { value: "investimentos", label: "Investimentos" },
  { value: "consorcios", label: "Consórcios" },
];

export function isPatrimonyTab(value: string | null): value is PatrimonyTab {
  return PATRIMONY_TABS.some((tab) => tab.value === value);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
