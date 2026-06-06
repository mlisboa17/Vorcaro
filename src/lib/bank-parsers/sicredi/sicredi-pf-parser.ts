import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Sicredi",
  bankId: "sicredi",
  identityMarkers: [/sicredi/i],
  pfExtraMarkers: [/cpf|titular|cooperado/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|cooperado\s+pj/i],
  parseLines: parseStatementLinesFromText,
});

export const sicrediPfParser = pf;
export const sicrediPjParser = pj;
