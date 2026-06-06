import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Banco Inter",
  bankId: "inter",
  identityMarkers: [/banco\s+inter|inter\s+empresas/i],
  pfExtraMarkers: [/cpf|titular|conta\s+corrente/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|inter\s+empresas|conta\s+pj/i],
  parseLines: parseStatementLinesFromText,
});

export const interPfParser = pf;
export const interPjParser = pj;
