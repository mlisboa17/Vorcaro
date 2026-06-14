import { z } from "zod";
import type { BankWebhookParser } from "./bank-webhook.parser";
import type { BankWebhookPayload } from "../../transactions/types/bank-webhook.types";

// Schema estrito para o payload do Asaas (Zero Any)
const asaasPayloadSchema = z.object({
  event: z.string({ required_error: "Event is required in Asaas payload" }),
  payment: z.object({
    id: z.string({ required_error: "Payment ID is required" }),
    value: z.number({ required_error: "Payment value is required" }),
    description: z.string().nullable().optional(),
    dateCreated: z.string().nullable().optional(),
    clientPaymentDate: z.string().nullable().optional(),
    creditDate: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export class AsaasWebhookParser implements BankWebhookParser {
  parse(rawPayload: unknown): Omit<BankWebhookPayload, "webhookToken"> {
    // Validação estrutural estrita com Zod (Zero Any)
    const data = asaasPayloadSchema.parse(rawPayload);

    let type: "CREDIT" | "DEBIT" = "CREDIT";
    let amount = data.payment.value;

    const eventUpper = data.event.toUpperCase();
    
    // Tratamento de Sinais Financeiros
    // Despesas (Ex: Taxas, Estornos) => Negativo
    // Receitas (Ex: Cobrança recebida) => Positivo
    if (eventUpper.includes("REFUND") || eventUpper.includes("CHARGEBACK") || eventUpper.includes("FEE")) {
      type = "DEBIT";
      amount = -Math.abs(amount); // Força ser negativo
    } else {
      type = "CREDIT";
      amount = Math.abs(amount); // Força ser positivo
    }

    // Priorizamos as datas de liquidação/pagamento antes da data de criação
    const txDate = data.payment.creditDate || data.payment.clientPaymentDate || data.payment.dateCreated || new Date().toISOString();

    return {
      eventId: data.payment.id, // ID único e estável do Asaas
      type,
      amount,
      description: data.payment.description || `Asaas Payment ${data.payment.id}`,
      date: txDate,
      metadata: { originalEvent: data.event },
    };
  }

  validateSignature(headers: Record<string, string>, secret: string): boolean {
    // Normalizamos as chaves para lowercase para evitar falhas case-sensitive
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    const asaasHeaderSchema = z.object({
      "asaas-access-token": z.string(),
    }).passthrough();

    const result = asaasHeaderSchema.safeParse(normalizedHeaders);
    if (!result.success) {
      return false; // Assinatura ausente ou formato inválido
    }

    // Isolamento Multitenant: O token enviado deve corresponder exatamente ao segredo do tenant
    return result.data["asaas-access-token"] === secret;
  }
}
