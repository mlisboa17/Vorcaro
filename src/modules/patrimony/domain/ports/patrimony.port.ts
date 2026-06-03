import type { AssetType, LiabilityType, PatrimonyTxType } from "@prisma/client";

export interface AccountingImpact {
  caixa: number;
  dre: number;
  patrimonioBruto: number;
  passivo: number;
  patrimonioLiquido: number;
}

export interface PatrimonyAssetRecord {
  id: string;
  userId: string;
  nome: string;
  descricao: string | null;
  tipo: AssetType;
  valorAquisicao: number;
  valorAtual: number;
  dataAquisicao: Date | null;
  estaAtivo: boolean;
  observacoes: string | null;
  linkedLiabilityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatrimonyLiabilityRecord {
  id: string;
  userId: string;
  nome: string;
  descricao: string | null;
  tipo: LiabilityType;
  saldoOriginal: number;
  saldoAtual: number;
  taxaJuros: number | null;
  dataContratacao: Date | null;
  dataQuitacaoPrevista: Date | null;
  estaAtivo: boolean;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatrimonyTransactionRecord {
  id: string;
  userId: string;
  assetId: string | null;
  liabilityId: string | null;
  tipo: PatrimonyTxType;
  valorTotal: number;
  data: Date;
  descricao: string | null;
  mainTransactionId: string | null;
  createdAt: Date;
}

export interface CreatePatrimonyAssetInput {
  userId: string;
  nome: string;
  descricao?: string | null;
  tipo: AssetType;
  valorAquisicao: number;
  valorAtual?: number;
  dataAquisicao?: Date | null;
  observacoes?: string | null;
  linkedLiabilityId?: string | null;
}

export interface UpdatePatrimonyAssetInput {
  nome?: string;
  descricao?: string | null;
  tipo?: AssetType;
  valorAquisicao?: number;
  valorAtual?: number;
  dataAquisicao?: Date | null;
  estaAtivo?: boolean;
  observacoes?: string | null;
  linkedLiabilityId?: string | null;
}

export interface CreatePatrimonyLiabilityInput {
  userId: string;
  nome: string;
  descricao?: string | null;
  tipo: LiabilityType;
  saldoOriginal: number;
  saldoAtual?: number;
  taxaJuros?: number | null;
  dataContratacao?: Date | null;
  dataQuitacaoPrevista?: Date | null;
  observacoes?: string | null;
}

export interface UpdatePatrimonyLiabilityInput {
  nome?: string;
  descricao?: string | null;
  tipo?: LiabilityType;
  saldoOriginal?: number;
  saldoAtual?: number;
  taxaJuros?: number | null;
  dataContratacao?: Date | null;
  dataQuitacaoPrevista?: Date | null;
  estaAtivo?: boolean;
  observacoes?: string | null;
}

export interface RegisterPatrimonyTransactionInput {
  userId: string;
  assetId?: string | null;
  liabilityId?: string | null;
  tipo: PatrimonyTxType;
  valorTotal: number;
  data: Date;
  descricao?: string | null;
  mainTransactionId?: string | null;
}

export interface InvestmentTransactionInput {
  userId: string;
  assetId: string;
  tipo: Extract<PatrimonyTxType, "APORTE" | "RESGATE" | "RENDIMENTO">;
  valorTotal: number;
  data: Date;
  descricao?: string | null;
  mainTransactionId?: string | null;
}

export interface FinancingPaymentInput {
  userId: string;
  liabilityId: string;
  data: Date;
  descricao?: string | null;
  amortizacao: number;
  juros: number;
  seguro: number;
  taxa: number;
  mainTransactionId?: string | null;
}

export interface ConsortiumParcelInput {
  userId: string;
  assetId: string;
  data: Date;
  descricao?: string | null;
  fundoComum: number;
  taxaAdministracao: number;
  fundoReserva?: number;
  mainTransactionId?: string | null;
}

export interface ConsortiumContemplationInput {
  userId: string;
  consortiumAssetId: string;
  targetAsset: {
    nome: string;
    tipo: Extract<AssetType, "REAL_ESTATE" | "VEHICLE" | "OTHER" | "BEM">;
    descricao?: string | null;
    dataAquisicao: Date;
  };
  saldoDevedorRemanescente?: number;
  liabilityNome?: string;
  data: Date;
  descricao?: string | null;
}

export interface AssetValuationInput {
  userId: string;
  assetId: string;
  tipo: Extract<PatrimonyTxType, "CORRECAO" | "DEPRECIACAO">;
  valorAjuste: number;
  data: Date;
  descricao?: string | null;
}

export interface PatrimonySummary {
  totalAtivos: number;
  totalPassivos: number;
  patrimonioLiquido: number;
  contasAReceber: number;
  ativosPorTipo: Record<AssetType, number>;
  passivosPorTipo: Record<LiabilityType, number>;
  evolucaoMensal: Array<{
    mes: string;
    ativos: number;
    passivos: number;
    patrimonioLiquido: number;
  }>;
}

export interface PatrimonyAssetRepositoryPort {
  listByUserId(userId: string, options?: { includeInactive?: boolean }): Promise<PatrimonyAssetRecord[]>;
  findByIdForUser(id: string, userId: string): Promise<PatrimonyAssetRecord | null>;
  create(input: CreatePatrimonyAssetInput): Promise<PatrimonyAssetRecord>;
  update(id: string, userId: string, input: UpdatePatrimonyAssetInput): Promise<PatrimonyAssetRecord | null>;
  deleteById(id: string, userId: string): Promise<boolean>;
  countUsage(id: string): Promise<number>;
}

export interface PatrimonyLiabilityRepositoryPort {
  listByUserId(userId: string, options?: { includeInactive?: boolean }): Promise<PatrimonyLiabilityRecord[]>;
  findByIdForUser(id: string, userId: string): Promise<PatrimonyLiabilityRecord | null>;
  create(input: CreatePatrimonyLiabilityInput): Promise<PatrimonyLiabilityRecord>;
  update(
    id: string,
    userId: string,
    input: UpdatePatrimonyLiabilityInput,
  ): Promise<PatrimonyLiabilityRecord | null>;
  deleteById(id: string, userId: string): Promise<boolean>;
  countUsage(id: string): Promise<number>;
}

export interface PatrimonyTransactionRepositoryPort {
  create(input: RegisterPatrimonyTransactionInput): Promise<PatrimonyTransactionRecord>;
  createMany(inputs: RegisterPatrimonyTransactionInput[]): Promise<PatrimonyTransactionRecord[]>;
  listByAssetId(assetId: string, userId: string): Promise<PatrimonyTransactionRecord[]>;
  listByLiabilityId(liabilityId: string, userId: string): Promise<PatrimonyTransactionRecord[]>;
}

export interface PatrimonyUnitOfWorkPort {
  registerInvestmentTransaction(input: InvestmentTransactionInput): Promise<{
    transactions: PatrimonyTransactionRecord[];
    asset: PatrimonyAssetRecord;
    impact: AccountingImpact;
  }>;
  registerFinancingPayment(input: FinancingPaymentInput): Promise<{
    transactions: PatrimonyTransactionRecord[];
    liability: PatrimonyLiabilityRecord;
    impact: AccountingImpact;
  }>;
  registerConsortiumParcel(input: ConsortiumParcelInput): Promise<{
    transactions: PatrimonyTransactionRecord[];
    asset: PatrimonyAssetRecord;
    impact: AccountingImpact;
  }>;
  registerConsortiumContemplation(input: ConsortiumContemplationInput): Promise<{
    closedAsset: PatrimonyAssetRecord;
    newAsset: PatrimonyAssetRecord;
    liability?: PatrimonyLiabilityRecord;
  }>;
  registerAssetValuation(input: AssetValuationInput): Promise<{
    transaction: PatrimonyTransactionRecord;
    asset: PatrimonyAssetRecord;
    impact: AccountingImpact;
  }>;
  getSummary(userId: string): Promise<PatrimonySummary>;
}
