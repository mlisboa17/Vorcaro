import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Caixa Econômica Federal",
  bankId: "caixa",
  identityMarkers: [/caixa\s+econ[oô]mica|\bcef\b/i],
  pfExtraMarkers: [/cpf|titular/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|empresarial/i],
  parseLines: parseStatementLinesFromText,
});

export const caixaPfParser = pf;
export const caixaPjParser = pj;
