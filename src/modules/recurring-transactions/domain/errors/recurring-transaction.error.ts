export class RecurringTransactionError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" = "VALIDATION",
  ) {
    super(message);
    this.name = "RecurringTransactionError";
  }
}
