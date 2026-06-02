export class BulkUpdateTransactionsError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION",
  ) {
    super(message);
    this.name = "BulkUpdateTransactionsError";
  }
}

export class BulkDeleteTransactionsError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION",
  ) {
    super(message);
    this.name = "BulkDeleteTransactionsError";
  }
}
