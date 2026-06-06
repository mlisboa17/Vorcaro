export type FinancialPartiesMetadata = {
  payerName?: string;
  payerDocument?: string;
  payerBank?: string;
  payerAgency?: string;
  payerAccount?: string;

  receiverName?: string;
  receiverDocument?: string;
  receiverBank?: string;
  receiverAgency?: string;
  receiverAccount?: string;

  pixKey?: string;
  transactionIdentifier?: string;
};

export const PARTIES_NOT_IDENTIFIED = "Não identificado";
