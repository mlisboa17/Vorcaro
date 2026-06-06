import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Banco do Brasil",
  bankId: "bb",
  identityMarkers: [/banco\s+do\s+brasil/i, /\bbb\b/i],
  statementRequired: [/ag[eê]ncia|conta\s+corrente|extrato/i],
  pfExtraMarkers: [/cpf|titular|pessoa\s+f[ií]sica/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|empresarial|pessoa\s+jur[ií]dica/i],
  parseLines: parseStatementLinesFromText,
});

export const bbPfParser = pf;
export const bbPjParser = pj;