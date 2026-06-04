export type VorcaroFollowUpErrorCode =
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "OPTIMISTIC_LOCK"
  | "DUPLICATE";

export class VorcaroFollowUpError extends Error {
  constructor(
    public readonly code: VorcaroFollowUpErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VorcaroFollowUpError";
  }
}
