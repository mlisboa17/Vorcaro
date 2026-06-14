import type { BankWebhookParser } from "./bank-webhook.parser";
import { AsaasWebhookParser } from "./asaas-webhook.parser";

export class UnsupportedProviderError extends Error {
  constructor(provider: string) {
    super(`Provider '${provider}' is not supported.`);
    this.name = "UnsupportedProviderError";
  }
}

export class WebhookParserFactory {
  static getParser(provider: string): BankWebhookParser {
    switch (provider.toLowerCase()) {
      case "asaas":
        return new AsaasWebhookParser();
      // Outros provedores podem ser adicionados aqui no futuro
      default:
        throw new UnsupportedProviderError(provider);
    }
  }
}
