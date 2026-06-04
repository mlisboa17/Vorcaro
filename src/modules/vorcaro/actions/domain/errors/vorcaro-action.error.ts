export type VorcaroActionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS"
  | "EXPIRED"
  | "INVALID_ACTION_TYPE"
  | "RATE_LIMIT_EXCEEDED"
  | "EXECUTION_FAILED";

export class VorcaroActionError extends Error {
  constructor(
    public readonly code: VorcaroActionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VorcaroActionError";
  }
}
