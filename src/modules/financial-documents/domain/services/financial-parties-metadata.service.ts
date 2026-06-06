import type { ParsedFinancialFields } from "../types/financial-document.types";
import type { FinancialPartiesMetadata } from "../types/financial-parties-metadata.types";
import { PARTIES_NOT_IDENTIFIED } from "../types/financial-parties-metadata.types";

export function buildPartiesMetadata(fields: ParsedFinancialFields): FinancialPartiesMetadata {
  return {
    payerName: fields.payerName,
    payerDocument: fields.payerDocument,
    payerBank: fields.payerBank,
    payerAgency: fields.payerAgency,
    payerAccount: fields.payerAccount,
    receiverName: fields.receiverName ?? fields.payeeName ?? fields.supplier,
    receiverDocument: fields.receiverDocument ?? fields.cpfCnpj,
    receiverBank: fields.receiverBank ?? fields.bank,
    receiverAgency: fields.receiverAgency ?? fields.agency,
    receiverAccount: fields.receiverAccount ?? fields.account,
    pixKey: fields.pixKey,
    transactionIdentifier: fields.documentNumber,
  };
}

export function readPartiesMetadata(source: unknown): FinancialPartiesMetadata {
  if (!source || typeof source !== "object") return {};
  return source as FinancialPartiesMetadata;
}

export function displayPartyValue(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : PARTIES_NOT_IDENTIFIED;
}

export function hasCriticalCounterpartyInfo(parties: FinancialPartiesMetadata): boolean {
  return Boolean(
    parties.receiverName?.trim() ||
      parties.payerName?.trim() ||
      parties.pixKey?.trim(),
  );
}
