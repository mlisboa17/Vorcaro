import type { ReceivableStatus } from "@prisma/client";

export interface ReceivableRecord {
  id: string;
  userId: string;
  descricao: string;
  devedorNome: string;
  valorOriginal: number;
  valorRecebido: number;
  valorPendente: number;
  status: ReceivableStatus;
  origem: string | null;
  observacoes: string | null;
  expectedDate: Date | null;
  receivedAt: Date | null;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReceivableInput {
  userId: string;
  descricao: string;
  devedorNome: string;
  valorOriginal: number;
  origem?: string | null;
  observacoes?: string | null;
  expectedDate?: Date | null;
  transactionId?: string | null;
}

export interface CollectReceivableInput {
  userId: string;
  receivableId: string;
  amount: number;
  accountId: string;
  date: Date;
  description?: string | null;
}

export interface ReceivableSummary {
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

export interface ReceivableRepositoryPort {
  create(input: CreateReceivableInput): Promise<ReceivableRecord>;
  findByIdForUser(id: string, userId: string): Promise<ReceivableRecord | null>;
  listByUserId(
    userId: string,
    options?: { status?: ReceivableStatus[]; includeCancelled?: boolean },
  ): Promise<ReceivableRecord[]>;
  update(
    id: string,
    userId: string,
    data: Partial<
      Pick<
        ReceivableRecord,
        | "valorRecebido"
        | "valorPendente"
        | "status"
        | "receivedAt"
        | "observacoes"
        | "expectedDate"
      >
    >,
  ): Promise<ReceivableRecord | null>;
  getSummary(userId: string): Promise<ReceivableSummary>;
  listOpenWithExpectedDateUntil(userId: string, until: Date): Promise<ReceivableRecord[]>;
}
