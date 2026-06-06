import { bbPfParser, bbPjParser } from "./bb/bb-pf-parser";
import { bradescoPfParser, bradescoPjParser } from "./bradesco/bradesco-pf-parser";
import { itauPfParser, itauPjParser } from "./itau/itau-pf-parser";
import { santanderPfParser, santanderPjParser } from "./santander/santander-pf-parser";
import { caixaPfParser, caixaPjParser } from "./caixa/caixa-pf-parser";
import { sicrediPfParser, sicrediPjParser } from "./sicredi/sicredi-pf-parser";
import { sicoobPfParser, sicoobPjParser } from "./sicoob/sicoob-pf-parser";
import { interPfParser, interPjParser } from "./inter/inter-pf-parser";
import {
  nubankBankParser,
  c6BankParser,
  pagbankBankParser,
  mercadoPagoBankParser,
  btgBankParser,
  xpBankParser,
  bbBankParser,
  bradescoBankParser,
  itauBankParser,
  santanderBankParser,
  interBankParser,
  caixaBankParser,
  sicoobBankParser,
  sicrediBankParser,
} from "./single-bank-parsers";

export {
  bbPfParser,
  bbPjParser,
  bradescoPfParser,
  bradescoPjParser,
  itauPfParser,
  itauPjParser,
  santanderPfParser,
  santanderPjParser,
  caixaPfParser,
  caixaPjParser,
  sicrediPfParser,
  sicrediPjParser,
  sicoobPfParser,
  sicoobPjParser,
  interPfParser,
  interPjParser,
  nubankBankParser,
  c6BankParser,
  pagbankBankParser,
  mercadoPagoBankParser,
  btgBankParser,
  xpBankParser,
  bbBankParser,
  bradescoBankParser,
  itauBankParser,
  santanderBankParser,
  interBankParser,
  caixaBankParser,
  sicoobBankParser,
  sicrediBankParser,
};

/** PJ parsers first — evita captura PF em documentos empresariais */
export const PF_PJ_BANK_PARSERS = [
  bbPjParser,
  bbPfParser,
  bradescoPjParser,
  bradescoPfParser,
  itauPjParser,
  itauPfParser,
  santanderPjParser,
  santanderPfParser,
  caixaPjParser,
  caixaPfParser,
  sicrediPjParser,
  sicrediPfParser,
  sicoobPjParser,
  sicoobPfParser,
  interPjParser,
  interPfParser,
];

export const PRIORITY_BANK_PARSERS = [
  ...PF_PJ_BANK_PARSERS,
  nubankBankParser,
  c6BankParser,
  pagbankBankParser,
];

export const RECOMMENDED_BANK_PARSERS = [mercadoPagoBankParser];

export const OPTIONAL_BANK_PARSERS = [btgBankParser, xpBankParser];

export const ALL_BANK_PARSERS = [
  ...PRIORITY_BANK_PARSERS,
  ...RECOMMENDED_BANK_PARSERS,
  ...OPTIONAL_BANK_PARSERS,
];
