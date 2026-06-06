import { ALL_BANK_PARSERS } from "./bank-parsers.registry";
import { genericBankStatementParser } from "./generic-bank-statement-parser";
import type { BankStatementParseResult, BankStatementParser } from "./bank-statement-parser.types";
import { resolveBankProfile } from "./bank-statement-profile-resolver";

function orderParsersByProfile(
  parsers: BankStatementParser[],
  profileHint: ReturnType<typeof resolveBankProfile>,
): BankStatementParser[] {
  if (profileHint === "UNKNOWN") return parsers;

  return [...parsers].sort((a, b) => {
    const aMatch = a.profile === profileHint ? 0 : a.profile === "UNKNOWN" ? 2 : 1;
    const bMatch = b.profile === profileHint ? 0 : b.profile === "UNKNOWN" ? 2 : 1;
    return aMatch - bMatch;
  });
}

export class BankStatementParserResolver {
  constructor(private readonly parsers: BankStatementParser[] = ALL_BANK_PARSERS) {}

  identifyParser(text: string): BankStatementParser | null {
    const profileHint = resolveBankProfile(text);
    const ordered = orderParsersByProfile(this.parsers, profileHint);
    for (const parser of ordered) {
      if (parser.canParse(text)) return parser;
    }
    return null;
  }

  resolve(text: string): BankStatementParseResult {
    const detectedProfile = resolveBankProfile(text);
    const parser = this.identifyParser(text);
    if (parser) {
      const statement = parser.parse(text);
      return { parser, statement, usedGenericFallback: false, detectedProfile };
    }

    const statement = genericBankStatementParser.parse(text);
    return { parser: null, statement, usedGenericFallback: true, detectedProfile };
  }
}

export const defaultBankStatementParserResolver = new BankStatementParserResolver();

export function resolveBankStatement(text: string): BankStatementParseResult {
  return defaultBankStatementParserResolver.resolve(text);
}
