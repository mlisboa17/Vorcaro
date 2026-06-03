export const RECEIVABLE_TRANSACTION_METADATA_KEY = "receivableId" as const;
export const THIRD_PARTY_PURCHASE_METADATA_KEY = "thirdPartyPurchase" as const;

export type TransactionMetadataRecord = Record<string, unknown>;

export function parseTransactionMetadata(metadata: unknown): TransactionMetadataRecord {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as TransactionMetadataRecord;
  }
  return {};
}

export function isThirdPartyExpenseTransaction(metadata: unknown): boolean {
  const parsed = parseTransactionMetadata(metadata);
  return parsed[THIRD_PARTY_PURCHASE_METADATA_KEY] === true || typeof parsed[RECEIVABLE_TRANSACTION_METADATA_KEY] === "string";
}

export function withReceivableTransactionMetadata(
  metadata: unknown,
  receivableId: string,
): TransactionMetadataRecord {
  return {
    ...parseTransactionMetadata(metadata),
    [RECEIVABLE_TRANSACTION_METADATA_KEY]: receivableId,
    [THIRD_PARTY_PURCHASE_METADATA_KEY]: true,
  };
}
