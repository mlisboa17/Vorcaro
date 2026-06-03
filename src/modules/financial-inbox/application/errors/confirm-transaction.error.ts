export type ConfirmTransactionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "VALIDATION"
  | "DUPLICATE";

export class ConfirmTransactionError extends Error {
  constructor(
    message: string,
    public readonly code: ConfirmTransactionErrorCode,
  ) {
    super(message);
    this.name = "ConfirmTransactionError";
  }
}
