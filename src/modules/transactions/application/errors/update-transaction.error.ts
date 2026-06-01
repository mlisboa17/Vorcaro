export class UpdateTransactionError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION",
  ) {
    super(message);
    this.name = "UpdateTransactionError";
  }
}
