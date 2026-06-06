import { createBankStatementParser } from "./create-bank-statement-parser";

export const nubankBankParser = createBankStatementParser({
  bankName: "Nubank",
  bankId: "nubank",
  profile: "PF",
  identityMarkers: [/nu\s+pagamentos|nubank/i],
  excludeInvoice: false,
  metadataExtractors: {
    branch: /ag[eê]ncia[:\s]+([\d\-Xx]+)/i,
    account: /conta[:\s]+([\d\-]+)/i,
    holderName: /(?:titular|cliente)[:\s]+([A-Za-zÀ-ú\s.'-]{3,80})/i,
    holderDocument: /cpf[:\s]+([\d.\-/]+)/i,
  },
});

export const c6BankParser = createBankStatementParser({
  bankName: "C6 Bank",
  bankId: "c6",
  profile: "PF",
  identityMarkers: [/c6\s+bank|c6bank/i],
});

export const pagbankBankParser = createBankStatementParser({
  bankName: "PagBank",
  bankId: "pagbank",
  profile: "UNKNOWN",
  identityMarkers: [/pagbank|pagseguro/i],
});

export const mercadoPagoBankParser = createBankStatementParser({
  bankName: "Mercado Pago",
  bankId: "mercado_pago",
  profile: "UNKNOWN",
  identityMarkers: [/mercado\s+pago/i],
  excludeInvoice: false,
});

export const btgBankParser = createBankStatementParser({
  bankName: "BTG Pactual",
  bankId: "btg",
  profile: "UNKNOWN",
  identityMarkers: [/btg\s+pactual|\bbtg\b/i],
});

export const xpBankParser = createBankStatementParser({
  bankName: "XP Investimentos",
  bankId: "xp",
  profile: "UNKNOWN",
  identityMarkers: [/xp\s+investimentos|\bxp\b/i],
});

/** @deprecated use bbPfParser */
export const bbBankParser = createBankStatementParser({
  bankName: "Banco do Brasil",
  bankId: "bb",
  identityMarkers: [/banco\s+do\s+brasil/i],
});

/** @deprecated use bradescoPfParser */
export const bradescoBankParser = createBankStatementParser({
  bankName: "Bradesco",
  bankId: "bradesco",
  identityMarkers: [/\bbradesco\b/i],
});

/** @deprecated use itauPfParser */
export const itauBankParser = createBankStatementParser({
  bankName: "Itaú",
  bankId: "itau",
  identityMarkers: [/ita[uú](?:\s+unibanco)?/i],
});

/** @deprecated use santanderPfParser */
export const santanderBankParser = createBankStatementParser({
  bankName: "Santander",
  bankId: "santander",
  identityMarkers: [/santander/i],
});

/** @deprecated use interPfParser */
export const interBankParser = createBankStatementParser({
  bankName: "Banco Inter",
  bankId: "inter",
  identityMarkers: [/banco\s+inter/i],
});

/** @deprecated use caixaPfParser */
export const caixaBankParser = createBankStatementParser({
  bankName: "Caixa Econômica Federal",
  bankId: "caixa",
  identityMarkers: [/caixa\s+econ[oô]mica|\bcef\b/i],
});

/** @deprecated use sicoobPfParser */
export const sicoobBankParser = createBankStatementParser({
  bankName: "Sicoob",
  bankId: "sicoob",
  identityMarkers: [/sicoob/i],
});

/** @deprecated use sicrediPfParser */
export const sicrediBankParser = createBankStatementParser({
  bankName: "Sicredi",
  bankId: "sicredi",
  identityMarkers: [/sicredi/i],
});
