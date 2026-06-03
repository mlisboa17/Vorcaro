import type { ReceivableRecord, ReceivableSummary } from "@/modules/receivables/domain/ports/receivable.port";

export type ReceivableStatusLabel =
  | "OPEN"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface ReceivableDto {
  id: string;
  descricao: string;
  devedorNome: string;
  valorOriginal: number;
  valorRecebido: number;
  valorPendente: number;
  status: ReceivableStatusLabel;
  origem: string | null;
  observacoes: string | null;
  expectedDate: string | null;
  receivedAt: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  vencido: boolean;
}

export interface ReceivableSummaryDto {
  totalOriginal: number;
  totalRecebido: number;
  totalPendente: number;
  totalVencido: number;
  countOpen: number;
  countPartial: number;
  countReceived: number;
  countCancelled: number;
  byDebtor: Array<{ devedorNome: string; valorPendente: number }>;
}

function isOverdue(expectedDate: Date | null): boolean {
  if (!expectedDate) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return expectedDate < today;
}

export function serializeReceivable(record: ReceivableRecord): ReceivableDto {
  return {
    id: record.id,
    descricao: record.descricao,
    devedorNome: record.devedorNome,
    valorOriginal: record.valorOriginal,
    valorRecebido: record.valorRecebido,
    valorPendente: record.valorPendente,
    status: record.status,
    origem: record.origem,
    observacoes: record.observacoes,
    expectedDate: record.expectedDate?.toISOString() ?? null,
    receivedAt: record.receivedAt?.toISOString() ?? null,
    transactionId: record.transactionId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    vencido:
      isOverdue(record.expectedDate) &&
      (record.status === "OPEN" || record.status === "PARTIALLY_RECEIVED"),
  };
}

export function serializeReceivableSummary(summary: ReceivableSummary): ReceivableSummaryDto {
  return summary;
}

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatusLabel, string> = {
  OPEN: "Em aberto",
  PARTIALLY_RECEIVED: "Parcialmente recebido",
  RECEIVED: "Recebido",
  CANCELLED: "Cancelado",
};
