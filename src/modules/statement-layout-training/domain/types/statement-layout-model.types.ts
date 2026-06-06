export type StatementLayoutFormat = "PDF" | "OFX" | "CSV" | "XLS" | "XLSX" | "UNKNOWN";

export type StatementLayoutSimilarityTier = "HIGH" | "MEDIUM" | "LOW";

export type StatementLayoutStatus = "ACTIVE" | "INACTIVE";

export type StatementLayoutApprovalStatus = "TESTING" | "APPROVED" | "DISABLED" | "REJECTED";

export type StatementLayoutRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type StatementLayoutFingerprint = {
  bankId: string | null;
  bankName: string | null;
  profile: "PF" | "PJ" | "UNKNOWN";
  fileFormat: StatementLayoutFormat;
  columnNames: string[];
  headerPatterns: string[];
  footerPatterns: string[];
  balanceLinePatterns: string[];
  continuationPatterns: string[];
  datePatterns: string[];
  amountPatterns: string[];
  keywords: string[];
  sampleLines: string[];
  lineCount: number;
};

export type StatementLayoutStructureRules = {
  datePatterns: string[];
  amountPatterns: string[];
  debitCreditRules: {
    debitMarkers: string[];
    creditMarkers: string[];
    separateColumns: boolean;
  };
  headerPatterns: string[];
  footerPatterns: string[];
  balanceLinePatterns: string[];
  continuationPatterns: string[];
  expectedColumns: string[];
  keywords: string[];
  correctedExamples: Array<{
    originalLine: string;
    date?: string;
    description?: string;
    amount?: number;
  }>;
  candidateRules?: Array<{
    id: string;
    type: "correction_pattern" | "ignore_balance" | "merge_description" | "amount_regex";
    description: string;
    sourceFiles: string[];
    occurrenceCount: number;
    suspicious: boolean;
    payload?: Record<string, unknown>;
  }>;
};

export type StatementLayoutMatchResult = {
  modelId: string | null;
  modelVersion: number | null;
  layoutLabel: string | null;
  bankId: string | null;
  bankName: string | null;
  profile: "PF" | "PJ" | "UNKNOWN";
  fileFormat: StatementLayoutFormat;
  similarityScore: number;
  similarityTier: StatementLayoutSimilarityTier;
  isNewModel: boolean;
  matchedBankId: string | null;
  message: string;
};

export type StatementLayoutModelView = {
  id: string;
  bankId: string;
  bankName: string;
  profile: string;
  fileFormat: StatementLayoutFormat;
  layoutLabel: string;
  accountType: string | null;
  version: number;
  accuracyRate: number;
  usageCount: number;
  successCount: number;
  correctionCount: number;
  lastUsedAt: string | null;
  lastSimilarityScore: number | null;
  status: StatementLayoutStatus;
  approvalStatus: StatementLayoutApprovalStatus;
  riskLevel: StatementLayoutRiskLevel;
  realImportCount: number;
  humanReviewConfirmedAt: string | null;
  isBuiltIn: boolean;
  parentModelId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StatementLayoutTrainingContext = {
  match: StatementLayoutMatchResult;
  forceReview: boolean;
};

export const SIMILARITY_TIER_THRESHOLDS = {
  HIGH: 75,
  MEDIUM: 50,
} as const;

export const RELATED_BANK_IDS: Record<string, string[]> = {
  bradesco: ["santander", "itau", "bb", "caixa"],
  santander: ["bradesco", "itau", "bb", "caixa"],
  itau: ["bradesco", "santander", "bb"],
  bb: ["bradesco", "santander", "caixa", "itau"],
  caixa: ["bb", "bradesco", "santander"],
  nubank: ["inter", "c6", "pagbank"],
  inter: ["nubank", "c6"],
  sicredi: ["sicoob"],
  sicoob: ["sicredi"],
};
