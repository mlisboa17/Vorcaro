import type { BankProfile, BankStatementParser, ExtractedBankStatement } from "./bank-statement-parser.types";
import {
  hasPfLayoutSignals,
  hasPjLayoutSignals,
  resolveBankProfile,
} from "./bank-statement-profile-resolver";
import {
  aggregateStatementConfidence,
  extractStatementMetadata,
  isLikelyBankStatement,
  parseStatementLinesFromText,
  type StatementMetadataExtractors,
} from "./bank-statement-parser.utils";
import { DEFAULT_METADATA, PF_METADATA, PJ_METADATA } from "./create-bank-statement-parser";

export type ProfileBankParserSpec = {
  bankName: string;
  bankId: string;
  identityMarkers: RegExp[];
  pfExtraMarkers?: RegExp[];
  pjExtraMarkers?: RegExp[];
  statementRequired?: RegExp[];
  excludeInvoice?: boolean;
  pfMetadataExtractors?: StatementMetadataExtractors;
  pjMetadataExtractors?: StatementMetadataExtractors;
  parseLines?: (text: string) => ReturnType<typeof parseStatementLinesFromText>;
  pfParseLines?: (text: string) => ReturnType<typeof parseStatementLinesFromText>;
  pjParseLines?: (text: string) => ReturnType<typeof parseStatementLinesFromText>;
};

function matchesIdentity(text: string, markers: RegExp[]): boolean {
  return markers.some((marker) => marker.test(text));
}

function buildProfileParser(
  spec: ProfileBankParserSpec,
  profile: "PF" | "PJ",
): BankStatementParser {
  const extraMarkers = profile === "PJ" ? spec.pjExtraMarkers ?? [] : spec.pfExtraMarkers ?? [];
  const metadataExtractors =
    profile === "PJ"
      ? { ...PJ_METADATA, ...spec.pjMetadataExtractors }
      : { ...PF_METADATA, ...spec.pfMetadataExtractors };
  const parseLines =
    profile === "PJ"
      ? (spec.pjParseLines ?? spec.parseLines ?? parseStatementLinesFromText)
      : (spec.pfParseLines ?? spec.parseLines ?? parseStatementLinesFromText);

  return {
    bankName: spec.bankName,
    bankId: spec.bankId,
    profile,
    canParse(text: string) {
      if (!matchesIdentity(text, spec.identityMarkers)) return false;
      if (extraMarkers.length > 0 && !matchesIdentity(text, extraMarkers) && profile === "PJ") {
        const detected = resolveBankProfile(text);
        if (detected !== "PJ" && !hasPjLayoutSignals(text)) return false;
      }
      if (spec.excludeInvoice !== false && !isLikelyBankStatement(text)) return false;
      if (
        spec.statementRequired &&
        spec.statementRequired.length > 0 &&
        !spec.statementRequired.some((marker) => marker.test(text))
      ) {
        return false;
      }

      const detected = resolveBankProfile(text);
      if (profile === "PJ") {
        return detected === "PJ" || hasPjLayoutSignals(text);
      }
      if (detected === "PJ" || hasPjLayoutSignals(text)) return false;
      return detected === "PF" || detected === "UNKNOWN" || hasPfLayoutSignals(text);
    },
    parse(text: string): ExtractedBankStatement {
      const warnings: string[] = [];
      const detected = resolveBankProfile(text);
      const resolvedProfile: BankProfile =
        profile === "PJ"
          ? detected === "PF"
            ? "PJ"
            : detected === "UNKNOWN"
              ? "PJ"
              : detected
          : detected === "PJ"
            ? "PF"
            : detected === "UNKNOWN"
              ? "PF"
              : detected;

      if (detected === "UNKNOWN") {
        warnings.push(`Perfil inferido como ${resolvedProfile} — confirme titular/documento`);
      }

      const metadata = extractStatementMetadata(text, metadataExtractors);
      const transactions = parseLines(text);

      if (transactions.length === 0) {
        warnings.push("Nenhuma movimentação estruturada identificada — revisão manual necessária");
      }

      return {
        bank: spec.bankName,
        profile: resolvedProfile,
        ...metadata,
        transactions,
        confidence: aggregateStatementConfidence(transactions, warnings),
        warnings,
      };
    },
  };
}

export function createProfileBankParsers(spec: ProfileBankParserSpec): {
  pf: BankStatementParser;
  pj: BankStatementParser;
} {
  return {
    pf: buildProfileParser(spec, "PF"),
    pj: buildProfileParser(spec, "PJ"),
  };
}
