export type CommitmentOrigin =
  | "RECURRENCE"
  | "INSTALLMENT"
  | "LIABILITY"
  | "CONSORTIUM"
  | "CREDIT_CARD"
  | "RECEIVABLE";

export type CommitmentType = "OUTFLOW" | "INFLOW";

export type CommitmentStatus = "PENDING" | "PAID" | "OVERDUE" | "PROJECTED";

export type MonthlyCommitment = {
  id: string;
  origem: CommitmentOrigin;
  descricao: string;
  tipo: CommitmentType;
  valor: number;
  dataPrevista: string; // YYYY-MM-DD
  categoria?: string | null;
  conta?: string | null;
  cartao?: string | null;
  status: CommitmentStatus;
};

