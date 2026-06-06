import { parseStatementLinesFromText } from "../bank-statement-parser.utils";
import { createProfileBankParsers } from "../create-profile-bank-parser";

const { pf, pj } = createProfileBankParsers({
  bankName: "Itaú",
  bankId: "itau",
  identityMarkers: [/ita[uú](?:\s+unibanco)?/i],
  pfExtraMarkers: [/cpf|titular|pessoa\s+f[ií]sica/i],
  pjExtraMarkers: [/cnpj|raz[aã]o\s+social|conta\s+empresarial/i],
  parseLines: parseStatementLinesFromText,
});

export const itauPfParser = pf;
export const itauPjParser = pj;
