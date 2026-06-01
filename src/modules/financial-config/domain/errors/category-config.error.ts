export class CategoryConfigError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NOT_FOUND" | "OWNERSHIP" = "VALIDATION",
  ) {
    super(message);
    this.name = "CategoryConfigError";
  }
}
