export type InboxStatusLiteral =
  | "PENDING"
  | "PROCESSING"
  | "NEEDS_CONFIRMATION"
  | "READY"
  | "SAVED"
  | "ERROR";

export type InboxStatusFilter = InboxStatusLiteral | "ALL";

export const INBOX_STATUS_TABS: { value: InboxStatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "NEEDS_CONFIRMATION", label: "Revisão" },
  { value: "READY", label: "Prontos" },
  { value: "PROCESSING", label: "Processando" },
  { value: "PENDING", label: "Pendentes" },
  { value: "SAVED", label: "Salvos" },
  { value: "ERROR", label: "Erros" },
];

export const METRIC_STATUSES = [
  "PENDING",
  "PROCESSING",
  "NEEDS_CONFIRMATION",
  "SAVED",
] as const satisfies readonly InboxStatusLiteral[];

export const REVIEWABLE_STATUSES: InboxStatusLiteral[] = ["READY", "NEEDS_CONFIRMATION"];
