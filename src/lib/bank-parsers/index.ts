export type {
  BankProfile,
  BankStatementParser,
  BankStatementParseResult,
  BankStatementTransactionMethod,
  ExtractedBankStatement,
  ExtractedBankStatementTransaction,
} from "./bank-statement-parser.types";

export {
  buildBankStatementLineFingerprint,
  normalizeDescriptionForFingerprint,
} from "./bank-statement-line-fingerprint";

export {
  BankStatementProfileResolver,
  defaultBankStatementProfileResolver,
  resolveBankProfile,
  hasPfLayoutSignals,
  hasPjLayoutSignals,
} from "./bank-statement-profile-resolver";

export {
  detectTransactionMethod,
  isLikelyBankStatement,
  isLikelyCardInvoice,
  normalizeDateToIso,
  parseBrazilianAmount,
  parseStatementLine,
  parseStatementLinesFromText,
} from "./bank-statement-parser.utils";

export { createBankStatementParser, PF_METADATA, PJ_METADATA } from "./create-bank-statement-parser";
export { createProfileBankParsers } from "./create-profile-bank-parser";

export {
  ALL_BANK_PARSERS,
  PF_PJ_BANK_PARSERS,
  PRIORITY_BANK_PARSERS,
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
  santanderBankParser,
  bbBankParser,
  bradescoBankParser,
  itauBankParser,
  interBankParser,
} from "./bank-parsers.registry";

export { genericBankStatementParser } from "./generic-bank-statement-parser";

export {
  BankStatementParserResolver,
  defaultBankStatementParserResolver,
  resolveBankStatement,
} from "./bank-statement-parser-resolver";

export { runBankStatementHomologation, assertHomologationTarget } from "./homologation/bank-statement-homologation.runner";
export { runRealPdfHomologation } from "./homologation/real-pdf-homologation.runner";
export type {
  BankHomologationReport,
  BankHomologationRow,
  OcrBenchmarkReport,
} from "./homologation/bank-statement-homologation.types";
export type {
  BankLayoutSource,
  BankLayoutDocumentType,
  BankHomologationStatus,
  BankFixtureMeta,
  BankLayoutCatalogEntry,
} from "./homologation/bank-layout.types";
export {
  detectBankLayoutSource,
  detectBankLayoutDocumentType,
  inferRequiresOcr,
} from "./homologation/bank-layout-source.detector";
