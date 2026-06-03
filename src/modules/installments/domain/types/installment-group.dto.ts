export type InstallmentGroupStatus = "ATIVO" | "CONCLUIDO";

export type InstallmentParcelStatus = "PAID" | "OPEN" | "OVERDUE";

/**
 * Grupo de parcelamento derivado de `Transaction.installmentGroup`.
 * Valores monetários em reais (número com 2 casas) — cálculo interno em centavos.
 */
export type InstallmentGroupDto = {
  installmentGroup: string;
  descricao: string;
  totalParcelas: number;
  parcelaAtual: number | null;
  valorParcela: number;
  valorTotal: number;
  parcelasPagas: number;
  parcelasRestantes: number;
  valorPago: number;
  valorRestante: number;
  primeiraParcela: string;
  ultimaParcela: string;
  categoria?: string | null;
  cartao?: string | null;
  status: InstallmentGroupStatus;
  /** false quando agrupado por fallback regex (legado / sem installmentGroup). */
  parcelamentoEstruturado: boolean;
};

export type InstallmentSummaryDto = {
  parceladoTotal: number;
  valorJaPago: number;
  valorRestante: number;
  parcelasRestantes: number;
  planosAtivos: number;
  planosConcluidos: number;
};

export type InstallmentFutureCommitmentDto = {
  transactionId: string;
  installmentGroup: string;
  descricao: string;
  numeroParcela: number;
  valor: number;
  data: string;
  cartao?: string | null;
  cardId?: string | null;
};

export type InstallmentGroupTransactionDto = {
  id: string;
  description: string;
  amount: number;
  date: string;
  dataCaixa: string | null;
  dataVencimentoFatura: string | null;
  dataVencimento: string;
  numeroParcela: number | null;
  totalParcelas: number | null;
  category: string | null;
  card: string | null;
  status: InstallmentParcelStatus;
};

export type InstallmentGroupDetailDto = {
  installmentGroup: string;
  descricao: string;
  valorTotal: number;
  valorPago: number;
  valorRestante: number;
  totalParcelas: number;
  parcelasPagas: number;
  parcelasRestantes: number;
  status: InstallmentGroupStatus;
  categoria?: string | null;
  cartao?: string | null;
  transactions: InstallmentGroupTransactionDto[];
};

export type InstallmentExecutiveSnapshotDto = {
  valorRestante: number;
  planosAtivos: number;
  parcelasAVencer30Dias: number;
  cartaoMaiorConcentracao: {
    nome: string;
    valorRestante: number;
    percentualDoTotal: number;
  } | null;
};
