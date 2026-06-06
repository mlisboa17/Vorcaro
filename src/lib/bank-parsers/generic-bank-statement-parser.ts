import type { BankStatementParser, ExtractedBankStatement } from "./bank-statement-parser.types";
import { resolveBankProfile } from "./bank-statement-profile-resolver";
import {
  aggregateStatementConfidence,
  isLikelyBankStatement,
  parseStatementLinesFromText,
} from "./bank-statement-parser.utils";

export const genericBankStatementParser: BankStatementParser = {
  bankName: "Genérico",
  bankId: "generic",
  profile: "UNKNOWN",
  canParse(text: string) {
    return isLikelyBankStatement(text) || parseStatementLinesFromText(text).length > 0;
  },
  parse(text: string): ExtractedBankStatement {
    const warnings: string[] = [
      "Banco não identificado — parser genérico aplicado",
      "Revise cada linha antes de confirmar",
    ];
    const transactions = parseStatementLinesFromText(text);

    if (transactions.length === 0) {
      warnings.push("Nenhuma movimentação extraída automaticamente");
    }

    for (const tx of transactions) {
      if (tx.confidence < 70) {
        tx.warnings.push("Confiança baixa — confirme data, valor e descrição");
      }
    }

    return {
      bank: "Não identificado",
      profile: resolveBankProfile(text),
      transactions,
      confidence: aggregateStatementConfidence(transactions, warnings),
      warnings,
    };
  },
};
