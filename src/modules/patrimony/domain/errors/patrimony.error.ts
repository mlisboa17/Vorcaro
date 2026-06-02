export class PatrimonyError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "VALIDATION"
      | "NOT_FOUND"
      | "OWNERSHIP"
      | "BUSINESS_RULE" = "VALIDATION",
  ) {
    super(message);
    this.name = "PatrimonyError";
  }
}
