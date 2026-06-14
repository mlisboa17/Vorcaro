import type { BankWebhookPayload } from "../../transactions/types/bank-webhook.types";

export interface BankWebhookParser {
  /**
   * Translates a raw webhook payload into the internal format expected by the use cases.
   * Ensures strict validation and returns the normalized properties.
   */
  parse(rawPayload: unknown): Omit<BankWebhookPayload, "webhookToken">;

  /**
   * Validates the webhook signature based on provider-specific headers and the integration secret.
   * Return false if the signature is missing or does not match the secret.
   */
  validateSignature(headers: Record<string, string>, secret: string): boolean;
}
