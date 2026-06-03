export class ReceivableError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "VALIDATION" | "FORBIDDEN" | "BUSINESS_RULE" = "BUSINESS_RULE",
  ) {
    super(message);
    this.name = "ReceivableError";
  }
}
