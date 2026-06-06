import type { BankProfile, BankStatementParser, ExtractedBankStatement } from "./bank-statement-parser.types";
import { resolveBankProfile } from "./bank-statement-profile-resolver";
import {
  aggregateStatementConfidence,
  extractStatementMetadata,
  isLikelyBankStatement,
  parseStatementLinesFromText,
  type StatementMetadataExtractors,
} from "./bank-statement-parser.utils";

export type CreateBankParserConfig = {
  bankName: string;
  bankId: string;
  profile?: BankProfile;
  identityMarkers: RegExp[];
  statementRequired?: RegExp[];
  excludeInvoice?: boolean;
  metadataExtractors?: StatementMetadataExtractors;
  parseLines?: (text: string) => ReturnType<typeof parseStatementLinesFromText>;
};

export const DEFAULT_METADATA: StatementMetadataExtractors = {
  branch: /ag[eê]ncia[:\s]+([\d\-Xx]+)/i,
  account: /conta(?:\s+corrente)?[:\s]+([\d\-Xx]+)/i,
  holderName: /(?:titular|cliente|nome)[:\s]+([A-Za-zÀ-ú\s.'-]{3,80})/i,
  holderDocument: /(?:cpf|cnpj)[:\s]+([\d.\-/]+)/i,
  period: /(?:per[ií]odo|de)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:a|at[eé])\s+(\d{2}\/\d{2}\/\d{4})/i,
};

export const PF_METADATA: StatementMetadataExtractors = {
  branch: /ag[eê]ncia[:\s]+([\d\-Xx]+)/i,
  account: /conta(?:\s+corrente)?(?:\s+pf)?[:\s]+([\d\-Xx]+)/i,
  holderName: /(?:titular|nome\s+do\s+cliente|cliente)[:\s]+([A-Za-zÀ-ú\s.'-]{3,80})/i,
  holderDocument: /cpf[:\s]+([\d.\-/]+)/i,
  period: DEFAULT_METADATA.period,
};

export const PJ_METADATA: StatementMetadataExtractors = {
  branch: /ag[eê]ncia[:\s]+([\d\-Xx]+)/i,
  account: /conta(?:\s+empresarial|\s+corrente|\s+pj)?[:\s]+([\d\-Xx]+)/i,
  holderName: /(?:raz[aã]o\s+social|empresa)[:\s]+([A-Za-zÀ-ú0-9\s.'&\-]{3,120})/i,
  holderDocument: /cnpj[:\s]+([\d.\-/]+)/i,
  period: DEFAULT_METADATA.period,
};

export function createBankStatementParser(config: CreateBankParserConfig): BankStatementParser {
  const {
    bankName,
    bankId,
    profile = "UNKNOWN",
    identityMarkers,
    statementRequired = [],
    excludeInvoice = true,
    metadataExtractors = DEFAULT_METADATA,
    parseLines = parseStatementLinesFromText,
  } = config;

  return {
    bankName,
    bankId,
    profile,
    canParse(text: string) {
      const hasIdentity = identityMarkers.some((marker) => marker.test(text));
      if (!hasIdentity) return false;
      if (excludeInvoice && !isLikelyBankStatement(text)) return false;
      if (statementRequired.length > 0 && !statementRequired.some((marker) => marker.test(text))) {
        return false;
      }
      return isLikelyBankStatement(text);
    },
    parse(text: string): ExtractedBankStatement {
      const warnings: string[] = [];
      const metadata = extractStatementMetadata(text, metadataExtractors);
      const transactions = parseLines(text);
      const detectedProfile = resolveBankProfile(text);

      if (transactions.length === 0) {
        warnings.push("Nenhuma movimentação estruturada identificada — revisão manual necessária");
      }

      return {
        bank: bankName,
        profile: detectedProfile !== "UNKNOWN" ? detectedProfile : profile,
        ...metadata,
        transactions,
        confidence: aggregateStatementConfidence(transactions, warnings),
        warnings,
      };
    },
  };
}
