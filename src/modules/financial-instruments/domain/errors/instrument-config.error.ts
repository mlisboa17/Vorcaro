export class InstrumentConfigError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NOT_FOUND" = "VALIDATION",
  ) {
    super(message);
    this.name = "InstrumentConfigError";
  }
}
