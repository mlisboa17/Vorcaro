export type CommitmentOrigin =
  | "RECURRENCE"
  | "INSTALLMENT"
  | "LIABILITY"
  | "CONSORTIUM"
  | "CREDIT_CARD"
  | "RECEIVABLE";

export type CommitmentType = "OUTFLOW" | "INFLOW";

export type CommitmentStatus = "PENDING" | "PAID" | "OVERDUE" | "PROJECTED";

export type MonthlyCommitmentDto = {
  id: string;
  origem: CommitmentOrigin;
  descricao: string;
  tipo: CommitmentType;
  valor: number;
  dataPrevista: string;
  categoria?: string | null;
  conta?: string | null;
  cartao?: string | null;
  status: CommitmentStatus;
};

export type MonthlyCommitmentsSummaryDto = {
  month: string;
  totalOutflows: number;
  totalInflows: number;
  netCommitment: number;
  commitmentsCount: number;
  overdueCount: number;
  next7DaysCount: number;
  byOrigin: Array<{ origin: string; total: number; count: number }>;
  items: MonthlyCommitmentDto[];
};

export const COMMITMENT_ORIGIN_LABELS: Record<CommitmentOrigin, string> = {
  RECURRENCE: "Recorrente",
  INSTALLMENT: "Parcelamento",
  LIABILITY: "Passivo / Financiamento",
  CONSORTIUM: "Consórcio",
  CREDIT_CARD: "Cartão / Fatura",
  RECEIVABLE: "Conta a receber",
};

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  PROJECTED: "Previsto",
};
