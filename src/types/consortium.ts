export type ConsortiumType = "VEHICLE" | "REAL_ESTATE" | "SERVICE" | "OTHER";

export type ConsortiumStatus =
  | "NOT_CONTEMPLATED"
  | "CONTEMPLATED"
  | "ASSET_ACQUIRED"
  | "COMPLETED";

export interface ConsortiumDto {
  id: string;
  nome: string;
  tipo: ConsortiumType;
  status: ConsortiumStatus;
  valorCredito: number;
  valorLance: number;
  valorPago: number;
  valorTaxas: number;
  quantidadeParcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  saldoRestante: number;
  percentualPago: number;
  dataContratacao: string | null;
  dataContemplacao: string | null;
  dataQuitacao: string | null;
  assetId: string | null;
  assetNome: string | null;
  lancamentoRecorrenteId: string | null;
  estaAtivo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsortiumListResponse {
  items: ConsortiumDto[];
  summary: {
    quantidade: number;
    creditoTotal: number;
    valorPago: number;
    saldoRestante: number;
    contemplados: number;
  };
}

export const CONSORTIUM_TYPE_LABELS: Record<ConsortiumType, string> = {
  VEHICLE: "Veículo",
  REAL_ESTATE: "Imóvel",
  SERVICE: "Serviço",
  OTHER: "Outro",
};

export const CONSORTIUM_STATUS_LABELS: Record<ConsortiumStatus, string> = {
  NOT_CONTEMPLATED: "Não contemplado",
  CONTEMPLATED: "Contemplado",
  ASSET_ACQUIRED: "Bem adquirido",
  COMPLETED: "Quitado",
};
