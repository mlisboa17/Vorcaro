export type BankProfile = "PF" | "PJ" | "UNKNOWN";

export type BankStatementTransactionMethod =
  | "PIX"
  | "TRANSFERENCIA"
  | "BOLETO"
  | "CARTAO_CREDITO"
  | "TARIFA"
  | "OUTROS";

export type BankStatementLineParseStatus = "RECOGNIZED" | "NEEDS_REVIEW" | "IGNORED" | "ERROR";

export type ExtractedBankStatementTransaction = {
  date: string;
  description: string;
  amount: number;
  direction: "INCOME" | "EXPENSE";
  balanceAfter?: number;
  documentNumber?: string;
  method?: BankStatementTransactionMethod;
  rawLine: string;
  confidence: number;
  fingerprint?: string;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
  warnings: string[];
  parseStatus?: BankStatementLineParseStatus;
  reviewMessage?: string;
};
export type ExtractedBankStatement = {
  bank: string;
  profile: BankProfile;
  account?: string;
  branch?: string;
  holderName?: string;
  holderDocument?: string;
  period?: {
    start?: string;
    end?: string;
  };
  transactions: ExtractedBankStatementTransaction[];
  confidence: number;
  warnings: string[];
};

export interface BankStatementParser {
  bankName: string;
  bankId: string;
  profile: BankProfile;
  canParse(text: string): boolean;
  parse(text: string): ExtractedBankStatement;
}

export type BankStatementParseResult = {
  parser: BankStatementParser | null;
  statement: ExtractedBankStatement;
  usedGenericFallback: boolean;
  detectedProfile: BankProfile;
};
