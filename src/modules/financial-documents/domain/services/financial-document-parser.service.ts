import type { TransactionMethod } from "@prisma/client";
import type { ParsedFinancialDocument, ParsedFinancialFields } from "../types/financial-document.types";

function parseBrazilianAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return undefined;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function parseBrazilianDate(raw: string): Date | undefined {
  const br = /(\d{2})[/.-](\d{2})[/.-](\d{4})/.exec(raw);
  if (br) {
    const [, d, m, y] = br;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const date = new Date(`${iso[0]}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

function detectMethod(text: string): TransactionMethod {
  const lower = text.toLowerCase();
  if (/pix|chave pix|transferência instantânea|transferencia instantanea/i.test(lower)) return "PIX";
  if (/ted|doc|transferência entre bancos|transferencia entre bancos/i.test(lower)) return "TRANSFERENCIA";
  if (/boleto|linha digitável|linha digitavel|código de barras|codigo de barras/i.test(lower)) return "BOLETO";
  if (/cartão|cartao|crédito|credito|fatura|mastercard|visa|elo/i.test(lower)) return "CARTAO_CREDITO";
  return "OUTROS";
}

function extractPixParties(text: string, fields: ParsedFinancialFields): Partial<ParsedFinancialFields> {
  const payerName = firstMatch(text, [
    /(?:pagador|quem\s*pagou|origem|debitado\s*de|conta\s*de\s*origem)\s*[:\s]*([^\n\r]{3,80})/i,
  ]);
  const payerDocument = firstMatch(text, [
    /(?:cpf|cnpj)\s*(?:do\s*)?(?:pagador|origem)\s*[:\s]*([\d./-]{11,18})/i,
  ]);
  const payerBank = firstMatch(text, [
    /(?:banco\s*(?:de\s*)?origem|banco\s*pagador|institui[cç][aã]o\s*origem)\s*[:\s]*([^\n\r]{3,60})/i,
  ]);

  const receiverName =
    firstMatch(text, [
      /(?:recebedor|favorecido|destinat[aá]rio|creditado\s*para)\s*[:\s]*([^\n\r]{3,80})/i,
    ]) ?? fields.supplier;
  const receiverDocument = firstMatch(text, [
    /(?:cpf|cnpj)\s*(?:do\s*)?(?:recebedor|favorecido|destinat[aá]rio)\s*[:\s]*([\d./-]{11,18})/i,
  ]);
  const receiverBank =
    firstMatch(text, [
      /(?:banco\s*destino|banco\s*recebedor|institui[cç][aã]o\s*destino)\s*[:\s]*([^\n\r]{3,60})/i,
    ]) ?? fields.bank;

  return {
    payerName,
    payerDocument,
    payerBank,
    receiverName,
    receiverDocument,
    receiverBank,
    payeeName: receiverName ?? fields.payeeName,
    supplier: receiverName ?? fields.supplier,
  };
}

function extractTransferParties(text: string): Partial<ParsedFinancialFields> {
  const payerName = firstMatch(text, [
    /(?:remetente|pagador|origem|debitado\s*de)\s*[:\s]*([^\n\r]{3,80})/i,
  ]);
  const receiverName = firstMatch(text, [
    /(?:favorecido|destinat[aá]rio|recebedor|creditado\s*para)\s*[:\s]*([^\n\r]{3,80})/i,
  ]);
  const payerBank = firstMatch(text, [
    /(?:banco\s*origem|banco\s*de\s*origem|institui[cç][aã]o\s*origem)\s*[:\s]*([^\n\r]{3,60})/i,
  ]);
  const receiverBank = firstMatch(text, [
    /(?:banco\s*destino|institui[cç][aã]o\s*destino)\s*[:\s]*([^\n\r]{3,60})/i,
  ]);
  const payerAgency = firstMatch(text, [/ag[eê]ncia\s*origem\s*[:\s]*([\d-]+)/i]);
  const payerAccount = firstMatch(text, [/conta\s*origem\s*[:\s]*([\d-]+)/i]);
  const receiverAgency = firstMatch(text, [/ag[eê]ncia\s*destino\s*[:\s]*([\d-]+)/i]);
  const receiverAccount = firstMatch(text, [/conta\s*destino\s*[:\s]*([\d-]+)/i]);

  const payerDocument = firstMatch(text, [
    /(?:cpf|cnpj)\s*(?:do\s*)?(?:remetente|pagador|origem)\s*[:\s]*([\d./-]{11,18})/i,
  ]);
  const receiverDocument = firstMatch(text, [
    /(?:cpf|cnpj)\s*(?:do\s*)?(?:favorecido|destinat[aá]rio|recebedor)\s*[:\s]*([\d./-]{11,18})/i,
  ]);

  return {
    payerName,
    payerDocument,
    payerBank,
    payerAgency,
    payerAccount,
    receiverName,
    receiverDocument,
    receiverBank,
    receiverAgency,
    receiverAccount,
    payeeName: receiverName,
    supplier: receiverName,
    bank: receiverBank ?? payerBank,
    agency: receiverAgency ?? payerAgency,
    account: receiverAccount ?? payerAccount,
  };
}

function cleanPixReceiverString(raw: string): string {
  let cleaned = raw.trim();
  // Remove CPF/CNPJ appended at the end or middle
  cleaned = cleaned.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "");
  cleaned = cleaned.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "");
  // Remove common bank names that might appear after the name
  cleaned = cleaned.replace(/\b(banco do brasil|bradesco|itau|itaú|nubank|caixa economica|caixa econômica|santander|c6 bank|inter|sicoob|sicredi)\b/gi, "");
  // Remove trailing institutions or codes like "BCO", "ISPB", "S.A."
  cleaned = cleaned.replace(/\b(bco|ispb|s\.a\.|s\/a|ltda|me)\b/gi, "");
  // Remove random alphanumeric strings long enough to be hashes or keys
  cleaned = cleaned.replace(/\b[A-Za-z0-9]{20,}\b/g, "");
  // Remove trailing isolated numbers and special characters
  cleaned = cleaned.replace(/[\d/.-]+$/g, "");
  // Clean up extra spaces
  return cleaned.replace(/\s+/g, " ").trim();
}

function mergePartyFields(method: TransactionMethod, text: string, fields: ParsedFinancialFields): ParsedFinancialFields {
  const partyFields =
    method === "PIX"
      ? extractPixParties(text, fields)
      : method === "TRANSFERENCIA"
        ? extractTransferParties(text)
        : {};

  let rawReceiver = partyFields.receiverName ?? fields.receiverName ?? fields.payeeName ?? fields.supplier;
  if (method === "PIX" && rawReceiver) {
    rawReceiver = cleanPixReceiverString(rawReceiver);
  }

  return {
    ...fields,
    ...partyFields,
    payerName: partyFields.payerName ?? fields.payerName,
    receiverName: rawReceiver,
    payeeName: partyFields.payeeName ?? fields.payeeName ?? rawReceiver,
    supplier: partyFields.supplier ?? fields.supplier ?? rawReceiver,
    cpfCnpj: partyFields.receiverDocument ?? fields.cpfCnpj,
    bank: partyFields.receiverBank ?? partyFields.payerBank ?? fields.bank,
    agency: partyFields.receiverAgency ?? partyFields.payerAgency ?? fields.agency,
    account: partyFields.receiverAccount ?? partyFields.payerAccount ?? fields.account,
  };
}

function extractCommonFields(text: string): ParsedFinancialFields {
  const amountRaw =
    firstMatch(text, [
      /valor\s*(?:pago|transferido|total)?\s*[:\s]*R?\$?\s*([\d.,]+)/i,
      /R\$\s*([\d.,]+)/i,
    ]) ?? undefined;

  const dateRaw =
    firstMatch(text, [
      /(?:data|realizado em|pagamento em|vencimento)\s*[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
      /(\d{2}[/.-]\d{2}[/.-]\d{4})/,
    ]) ?? undefined;

  const cpfCnpj = firstMatch(text, [
    /(?:cpf|cnpj)\s*[:\s]*([\d./-]{11,18})/i,
    /([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/,
    /([\d]{2}\.[\d]{3}\.[\d]{3}\/[\d]{4}-[\d]{2})/,
  ]);

  const documentNumber = firstMatch(text, [
    /(?:id|identificador|autenticação|autenticacao|comprovante)\s*[:\s#]*([A-Z0-9-]{8,})/i,
    /(?:n[ºo°]\s*(?:transação|transacao|documento))\s*[:\s]*([A-Z0-9-]{6,})/i,
  ]);

  const pixKey = firstMatch(text, [
    /chave pix\s*[:\s]*([^\n\r]{3,80})/i,
    /pix\s*[:\s]*([a-z0-9@.+_-]{3,80})/i,
  ]);

  const supplier =
    firstMatch(text, [
      /(?:favorecido|destinatário|destinatario|beneficiário|beneficiario|para)\s*[:\s]*([^\n\r]{3,80})/i,
      /(?:estabelecimento|loja|merchant)\s*[:\s]*([^\n\r]{3,80})/i,
    ]) ?? undefined;

  const bank = firstMatch(text, [
    /(?:banco|instituição|instituicao)\s*[:\s]*([^\n\r]{3,60})/i,
    /(nubank|itaú|itau|bradesco|banco do brasil|bb|santander|caixa|inter|c6 bank)/i,
  ]);

  const agency = firstMatch(text, [/ag[êe]ncia\s*[:\s]*([\d-]+)/i]);
  const account = firstMatch(text, [/conta\s*[:\s]*([\d-]+)/i]);

  const barcode = firstMatch(text, [
    /(?:linha digitável|linha digitavel|código de barras|codigo de barras)\s*[:\s]*([\d.\s]{40,60})/i,
  ])?.replace(/\s/g, "");

  const cardLastDigits = firstMatch(text, [/cartão\s*\*+\s*(\d{4})/i, /\*+(\d{4})/]);

  return {
    amount: amountRaw ? parseBrazilianAmount(amountRaw) : undefined,
    date: dateRaw ? parseBrazilianDate(dateRaw) : undefined,
    supplier,
    pixKey: pixKey?.replace(/\s+$/, ""),
    documentNumber,
    cpfCnpj,
    bank,
    agency,
    account,
    barcode,
    cardLastDigits,
    description: supplier,
    payeeName: supplier,
  };
}

export function parseFinancialDocumentText(text: string): ParsedFinancialDocument {
  const method = detectMethod(text);
  const baseFields = extractCommonFields(text);
  const fields = mergePartyFields(method, text, baseFields);
  const rawMatches: Record<string, string> = {};

  if (fields.amount != null) rawMatches.amount = String(fields.amount);
  if (fields.date) rawMatches.date = fields.date.toISOString();
  if (fields.pixKey) rawMatches.pixKey = fields.pixKey;
  if (fields.documentNumber) rawMatches.documentNumber = fields.documentNumber;
  if (fields.supplier) rawMatches.supplier = fields.supplier;
  if (fields.payerName) rawMatches.payerName = fields.payerName;
  if (fields.receiverName) rawMatches.receiverName = fields.receiverName;
  if (fields.barcode) rawMatches.barcode = fields.barcode;

  return { method, fields, rawMatches };
}

export function normalizeSupplierName(name: string | undefined | null): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
