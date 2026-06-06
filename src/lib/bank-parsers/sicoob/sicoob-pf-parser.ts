import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Sicoob",
  bankId: "sicoob",
  identityMarkers: [/sicoob/i],
  pfExtraMarkers: [/cpf|titular|cooperado/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|cooperado\s+pj/i],
  parseLines: parseStatementLinesFromText,
});

export const sicoobPfParser = pf;
export const sicoobPjParser = pj;
