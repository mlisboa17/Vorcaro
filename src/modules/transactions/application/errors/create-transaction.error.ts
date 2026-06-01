export class CreateTransactionError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "CreateTransactionError";
  }
}
