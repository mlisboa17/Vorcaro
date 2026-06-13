export interface BankWebhookPayload {
  eventId: string; // Idempotency key (providerEventId)
  webhookToken: string; // Identificador da integração
  type: "CREDIT" | "DEBIT";
  amount: number;
  description: string;
  date: string; // ISO 8601 string
  metadata?: Record<string, unknown>;
}
