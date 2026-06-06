import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Santander",
  bankId: "santander",
  identityMarkers: [/santander/i],
  statementRequired: [/conta\s+corrente|extrato/i],
  pfExtraMarkers: [/cpf|titular/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|empresarial/i],
  parseLines: parseStatementLinesFromText,
});

export const santanderPfParser = pf;
export const santanderPjParser = pj;
