import type { FinancialDocumentStatus } from "@prisma/client";

export const ACTIVE_DOCUMENT_STATUSES: FinancialDocumentStatus[] = [
  "UPLOADED",
  "PROCESSING",
  "EXTRACTED",
  "REVIEW_REQUIRED",
  "PASSWORD_REQUIRED",
];

export const RECOVERABLE_DOCUMENT_STATUSES: FinancialDocumentStatus[] = ["REJECTED", "FAILED"];

export const UPLOAD_MESSAGES = {
  APPROVED:
    "Este documento já foi aprovado anteriormente.",
  IN_REVIEW:
    "Este documento já está em revisão ou processamento.",
  REJECTED:
    "Este documento foi rejeitado. Deseja reabrir ou reprocessar?",
  FAILED:
    "Este documento falhou no processamento. Você pode tentar novamente.",
  RECOVERED:
    "Documento recuperado. Processando novamente…",
} as const;

export function isActiveDocumentStatus(status: FinancialDocumentStatus): boolean {
  return ACTIVE_DOCUMENT_STATUSES.includes(status);
}

export function isRecoverableDocumentStatus(status: FinancialDocumentStatus): boolean {
  return RECOVERABLE_DOCUMENT_STATUSES.includes(status);
}
