export class BatchInboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchInboxError";
  }
}
