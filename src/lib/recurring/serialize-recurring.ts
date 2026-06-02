import type { FrequenciaRecorrencia, TipoLancamentoRecorrente } from "@prisma/client";

export function serializeRecurring(record: {
  id: string;
  descricao: string;
  tipo: TipoLancamentoRecorrente;
  valor: number;
  frequencia: FrequenciaRecorrencia;
  dataInicio: Date;
  dataFim: Date | null;
  proximaExecucao: Date;
  estaAtivo: boolean;
  categoryId: string;
  financialAccountId: string;
  paymentMethodId: string;
  cardId: string | null;
  liabilityId: string | null;
  defaultAllocations: import("@/lib/financial/liability-payment-metadata").TransactionAllocation[] | null;
  observacoes: string | null;
}) {
  return {
    id: record.id,
    descricao: record.descricao,
    tipo: record.tipo,
    valor: record.valor,
    frequencia: record.frequencia,
    dataInicio: record.dataInicio.toISOString().slice(0, 10),
    dataFim: record.dataFim ? record.dataFim.toISOString().slice(0, 10) : null,
    proximaExecucao: record.proximaExecucao.toISOString().slice(0, 10),
    estaAtivo: record.estaAtivo,
    categoriaId: record.categoryId,
    contaFinanceiraId: record.financialAccountId,
    formaPagamentoId: record.paymentMethodId,
    cartaoId: record.cardId,
    liabilityId: record.liabilityId,
    defaultAllocations: record.defaultAllocations,
    observacoes: record.observacoes,
  };
}
