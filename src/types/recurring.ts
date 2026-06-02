import type { FrequenciaRecorrencia, TipoLancamentoRecorrente } from "@prisma/client";
import type { TransactionAllocation } from "@/lib/financial/liability-payment-metadata";

export interface RecurringTransactionItem {
  id: string;
  descricao: string;
  tipo: TipoLancamentoRecorrente;
  valor: number;
  frequencia: FrequenciaRecorrencia;
  dataInicio: string;
  dataFim: string | null;
  proximaExecucao: string;
  estaAtivo: boolean;
  categoriaId: string;
  contaFinanceiraId: string;
  formaPagamentoId: string;
  cartaoId: string | null;
  liabilityId: string | null;
  defaultAllocations: TransactionAllocation[] | null;
  observacoes: string | null;
}

export interface RecurringTransactionListResponse {
  items: RecurringTransactionItem[];
}

export const FREQUENCIA_LABELS: Record<FrequenciaRecorrencia, string> = {
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
  BIMESTRAL: "Bimestral",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

export const TIPO_LABELS = {
  DESPESA: "Despesa",
  RECEITA: "Receita",
} as const;
